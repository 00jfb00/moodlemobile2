// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSiteWSPreSets } from '@classes/site';
import { CoreGradesHelperProvider } from '@core/grades/providers/helper';
import { CoreQuestionDelegate } from '@core/question/providers/delegate';
import { AddonModQuizAccessRuleDelegate } from './access-rules-delegate';
import { AddonModQuizOfflineProvider } from './quiz-offline';
import * as moment from 'moment';

/**
 * Service that provides some features for quiz.
 */
@Injectable()
export class AddonModQuizProvider {
    static COMPONENT = 'mmaModQuiz';

    // Grade methods.
    static GRADEHIGHEST = 1;
    static GRADEAVERAGE = 2;
    static ATTEMPTFIRST = 3;
    static ATTEMPTLAST  = 4;

    // Question options.
    static QUESTION_OPTIONS_MAX_ONLY = 1;
    static QUESTION_OPTIONS_MARK_AND_MAX = 2;

    // Attempt state.
    static ATTEMPT_IN_PROGRESS = 'inprogress';
    static ATTEMPT_OVERDUE     = 'overdue';
    static ATTEMPT_FINISHED    = 'finished';
    static ATTEMPT_ABANDONED   = 'abandoned';

    // Show the countdown timer if there is less than this amount of time left before the the quiz close date.
    static QUIZ_SHOW_TIME_BEFORE_DEADLINE = 3600;

    protected ROOT_CACHE_KEY = 'mmaModQuiz:';
    protected logger;
    protected div = document.createElement('div'); // A div element to search in HTML code.

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider,
            private translate: TranslateService, private textUtils: CoreTextUtilsProvider,
            private gradesHelper: CoreGradesHelperProvider, private questionDelegate: CoreQuestionDelegate,
            private filepoolProvider: CoreFilepoolProvider, private timeUtils: CoreTimeUtilsProvider,
            private accessRulesDelegate: AddonModQuizAccessRuleDelegate, private quizOfflineProvider: AddonModQuizOfflineProvider) {
        this.logger = logger.getInstance('AddonModQuizProvider');
    }

    /**
     * Formats a grade to be displayed.
     *
     * @param {number} grade Grade.
     * @param {number} decimals Decimals to use.
     * @return {string} Grade to display.
     */
    formatGrade(grade: number, decimals: number): string {
        if (typeof grade == 'undefined' || grade == -1 || grade === null) {
            return this.translate.instant('addon.mod_quiz.notyetgraded');
        }

        return this.utils.formatFloat(this.textUtils.roundToDecimals(grade, decimals));
    }

    /**
     * Get attempt questions. Returns all of them or just the ones in certain pages.
     *
     * @param {any} quiz Quiz.
     * @param {any} attempt Attempt.
     * @param {any} preflightData Preflight required data (like password).
     * @param {number[]} [pages] List of pages to get. If not defined, all pages.
     * @param {boolean} [offline] Whether it should return cached data. Has priority over ignoreCache.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the questions.
     */
    getAllQuestionsData(quiz: any, attempt: any, preflightData: any, pages?: number[], offline?: boolean, ignoreCache?: boolean,
            siteId?: string): Promise<any> {

        const promises = [],
            questions = {},
            isSequential = this.isNavigationSequential(quiz);

        if (!pages) {
            pages = this.getPagesFromLayout(attempt.layout);
        }

        pages.forEach((page) => {
            if (isSequential && page < attempt.currentpage) {
                // Sequential quiz, cannot get pages before the current one.
                return;
            }

            // Get the questions in the page.
            promises.push(this.getAttemptData(attempt.id, page, preflightData, offline, ignoreCache, siteId).then((data) => {
                // Add the questions to the result object.
                data.questions.forEach((question) => {
                    questions[question.slot] = question;
                });
            }));
        });

        return Promise.all(promises).then(() => {
            return questions;
        });
    }

    /**
     * Get cache key for get attempt access information WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} attemptId Attempt ID.
     * @return {string} Cache key.
     */
    protected getAttemptAccessInformationCacheKey(quizId: number, attemptId: number): string {
        return this.getAttemptAccessInformationCommonCacheKey(quizId) + ':' + attemptId;
    }

    /**
     * Get common cache key for get attempt access information WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @return {string} Cache key.
     */
    protected getAttemptAccessInformationCommonCacheKey(quizId: number): string {
        return this.ROOT_CACHE_KEY + 'attemptAccessInformation:' + quizId;
    }

    /**
     * Get access information for an attempt.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} attemptId Attempt ID. 0 for user's last attempt.
     * @param {boolean} offline Whether it should return cached data. Has priority over ignoreCache.
     * @param {boolean} ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the access information.
     */
    getAttemptAccessInformation(quizId: number, attemptId: number, offline?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    quizid: quizId,
                    attemptid: attemptId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getAttemptAccessInformationCacheKey(quizId, attemptId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_quiz_get_attempt_access_information', params, preSets);
        });
    }

    /**
     * Get cache key for get attempt data WS calls.
     *
     * @param {number} attemptId Attempt ID.
     * @param {number} page Page.
     * @return {string} Cache key.
     */
    protected getAttemptDataCacheKey(attemptId: number, page: number): string {
        return this.getAttemptDataCommonCacheKey(attemptId) + ':' + page;
    }

    /**
     * Get common cache key for get attempt data WS calls.
     *
     * @param {number} attemptId Attempt ID.
     * @return {string} Cache key.
     */
    protected getAttemptDataCommonCacheKey(attemptId: number): string {
        return this.ROOT_CACHE_KEY + 'attemptData:' + attemptId;
    }

    /**
     * Get an attempt's data.
     *
     * @param {number} attemptId Attempt ID.
     * @param {number} page Page number.
     * @param {any} preflightData Preflight required data (like password).
     * @param {boolean} [offline] Whether it should return cached data. Has priority over ignoreCache.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the attempt data.
     */
    getAttemptData(attemptId: number, page: number, preflightData: any, offline?: boolean, ignoreCache?: boolean, siteId?: string)
            : Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    attemptid: attemptId,
                    page: page,
                    preflightdata: this.utils.objectToArrayOfObjects(preflightData, 'name', 'value', true)
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getAttemptDataCacheKey(attemptId, page)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_quiz_get_attempt_data', params, preSets);
        });
    }

    /**
     * Get an attempt's due date.
     *
     * @param {any} quiz Quiz.
     * @param {any} attempt Attempt.
     * @return {number} Attempt's due date, 0 if no due date or invalid data.
     */
    getAttemptDueDate(quiz: any, attempt: any): number {
        const deadlines = [];

        if (quiz.timelimit) {
            deadlines.push(parseInt(attempt.timestart, 10) + parseInt(quiz.timelimit, 10));
        }
        if (quiz.timeclose) {
            deadlines.push(parseInt(quiz.timeclose, 10));
        }

        if (!deadlines.length) {
            return 0;
        }

        // Get min due date.
        const dueDate = Math.min.apply(null, deadlines);
        if (!dueDate) {
            return 0;
        }

        switch (attempt.state) {
            case AddonModQuizProvider.ATTEMPT_IN_PROGRESS:
                return dueDate * 1000;

            case AddonModQuizProvider.ATTEMPT_OVERDUE:
                return (dueDate + parseInt(quiz.graceperiod, 10)) * 1000;

            default:
                this.logger.warn('Unexpected state when getting due date: ' + attempt.state);

                return 0;
        }
    }

    /**
     * Get an attempt's warning because of due date.
     *
     * @param {any} quiz Quiz.
     * @param {any} attempt Attempt.
     * @return {string} Attempt's warning, undefined if no due date.
     */
    getAttemptDueDateWarning(quiz: any, attempt: any): string {
        const dueDate = this.getAttemptDueDate(quiz, attempt);

        if (attempt.state === AddonModQuizProvider.ATTEMPT_OVERDUE) {
            return this.translate.instant('addon.mod_quiz.overduemustbesubmittedby', {$a: moment(dueDate).format('LLL')});
        } else if (dueDate) {
            return this.translate.instant('addon.mod_quiz.mustbesubmittedby', {$a: moment(dueDate).format('LLL')});
        }
    }

    /**
     * Turn attempt's state into a readable state, including some extra data depending on the state.
     *
     * @param {any} quiz Quiz.
     * @param {any} attempt Attempt.
     * @return {string[]} List of state sentences.
     */
    getAttemptReadableState(quiz: any, attempt: any): string[] {
        if (attempt.finishedOffline) {
            return [this.translate.instant('addon.mod_quiz.finishnotsynced')];
        }

        switch (attempt.state) {
            case AddonModQuizProvider.ATTEMPT_IN_PROGRESS:
                return [this.translate.instant('addon.mod_quiz.stateinprogress')];

            case AddonModQuizProvider.ATTEMPT_OVERDUE:
                const sentences = [],
                    dueDate = this.getAttemptDueDate(quiz, attempt);

                sentences.push(this.translate.instant('addon.mod_quiz.stateoverdue'));

                if (dueDate) {
                    sentences.push(this.translate.instant('addon.mod_quiz.stateoverduedetails',
                            {$a: moment(dueDate).format('LLL')}));
                }

                return sentences;

            case AddonModQuizProvider.ATTEMPT_FINISHED:
                return [
                    this.translate.instant('addon.mod_quiz.statefinished'),
                    this.translate.instant('addon.mod_quiz.statefinisheddetails',
                            {$a: moment(attempt.timefinish * 1000).format('LLL')})
                ];

            case AddonModQuizProvider.ATTEMPT_ABANDONED:
                return [this.translate.instant('addon.mod_quiz.stateabandoned')];

            default:
                return [];
        }
    }

    /**
     * Turn attempt's state into a readable state name, without any more data.
     *
     * @param {string} state State.
     * @return {string} Readable state name.
     */
    getAttemptReadableStateName(state: string): string {
        switch (state) {
            case AddonModQuizProvider.ATTEMPT_IN_PROGRESS:
                return this.translate.instant('addon.mod_quiz.stateinprogress');

            case AddonModQuizProvider.ATTEMPT_OVERDUE:
                return this.translate.instant('addon.mod_quiz.stateoverdue');

            case AddonModQuizProvider.ATTEMPT_FINISHED:
                return this.translate.instant('addon.mod_quiz.statefinished');

            case AddonModQuizProvider.ATTEMPT_ABANDONED:
                return this.translate.instant('addon.mod_quiz.stateabandoned');

            default:
                return '';
        }
    }

    /**
     * Get cache key for get attempt review WS calls.
     *
     * @param {number} attemptId Attempt ID.
     * @param {number} page Page.
     * @return {string} Cache key.
     */
    protected getAttemptReviewCacheKey(attemptId: number, page: number): string {
        return this.getAttemptReviewCommonCacheKey(attemptId) + ':' + page;
    }

    /**
     * Get common cache key for get attempt review WS calls.
     *
     * @param {number} attemptId Attempt ID.
     * @return {string} Cache key.
     */
    protected getAttemptReviewCommonCacheKey(attemptId: number): string {
        return this.ROOT_CACHE_KEY + 'attemptReview:' + attemptId;
    }

    /**
     * Get an attempt's review.
     *
     * @param {number} attemptId Attempt ID.
     * @param {number} [page] Page number. If not defined, return all the questions in all the pages.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the attempt review.
     */
    getAttemptReview(attemptId: number, page?: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        if (typeof page == 'undefined') {
            page = -1;
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    attemptid: attemptId,
                    page: page
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getAttemptReviewCacheKey(attemptId, page)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_quiz_get_attempt_review', params, preSets);
        });
    }

    /**
     * Get cache key for get attempt summary WS calls.
     *
     * @param {number} attemptId Attempt ID.
     * @return {string} Cache key.
     */
    protected getAttemptSummaryCacheKey(attemptId: number): string {
        return this.ROOT_CACHE_KEY + 'attemptSummary:' + attemptId;
    }

    /**
     * Get an attempt's summary.
     *
     * @param {number} attemptId Attempt ID.
     * @param {any} preflightData Preflight required data (like password).
     * @param {boolean} [offline] Whether it should return cached data. Has priority over ignoreCache.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {boolean} [loadLocal] Whether it should load local state for each question. Only applicable if offline=true.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of questions for the attempt summary.
     */
    getAttemptSummary(attemptId: number, preflightData: any, offline?: boolean, ignoreCache?: boolean, loadLocal?: boolean,
            siteId?: string): Promise<any[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    attemptid: attemptId,
                    preflightdata: this.utils.objectToArrayOfObjects(preflightData, 'name', 'value', true)
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getAttemptSummaryCacheKey(attemptId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_quiz_get_attempt_summary', params, preSets).then((response) => {
                if (response && response.questions) {
                    if (offline && loadLocal) {
                        return this.quizOfflineProvider.loadQuestionsLocalStates(attemptId, response.questions, site.getId());
                    }

                    return response.questions;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get combined review options WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} userId User ID.
     * @return {string} Cache key.
     */
    protected getCombinedReviewOptionsCacheKey(quizId: number, userId: number): string {
        return this.getCombinedReviewOptionsCommonCacheKey(quizId) + ':' + userId;
    }

    /**
     * Get common cache key for get combined review options WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @return {string} Cache key.
     */
    protected getCombinedReviewOptionsCommonCacheKey(quizId: number): string {
        return this.ROOT_CACHE_KEY + 'combinedReviewOptions:' + quizId;
    }

    /**
     * Get a quiz combined review options.
     *
     * @param {number} quizId  Quiz ID.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>}Promise resolved with the combined review options.
     */
    getCombinedReviewOptions(quizId: number, ignoreCache?: boolean, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    quizid: quizId,
                    userid: userId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getCombinedReviewOptionsCacheKey(quizId, userId)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_quiz_get_combined_review_options', params, preSets).then((response) => {
                if (response && response.someoptions && response.alloptions) {
                    // Convert the arrays to objects with name -> value.
                    response.someoptions = this.utils.objectToKeyValueMap(response.someoptions, 'name', 'value');
                    response.alloptions = this.utils.objectToKeyValueMap(response.alloptions, 'name', 'value');

                    return response;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get feedback for grade WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} grade  Grade.
     * @return {string} Cache key.
     */
    protected getFeedbackForGradeCacheKey(quizId: number, grade: number): string {
        return this.getFeedbackForGradeCommonCacheKey(quizId) + ':' + grade;
    }

    /**
     * Get common cache key for get feedback for grade WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @return {string} Cache key.
     */
    protected getFeedbackForGradeCommonCacheKey(quizId: number): string {
        return this.ROOT_CACHE_KEY + 'feedbackForGrade:' + quizId;
    }

    /**
     * Get the feedback for a certain grade.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} grade Grade.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the feedback.
     */
    getFeedbackForGrade(quizId: number, grade: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    quizid: quizId,
                    grade: grade
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getFeedbackForGradeCacheKey(quizId, grade)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_quiz_get_quiz_feedback_for_grade', params, preSets);
        });
    }

    /**
     * Determine the correct number of decimal places required to format a grade.
     * Based on Moodle's quiz_get_grade_format.
     *
     * @param {any} quiz Quiz.
     * @return {number} Number of decimals.
     */
    getGradeDecimals(quiz: any): number {
        if (typeof quiz.questiondecimalpoints == 'undefined') {
            quiz.questiondecimalpoints = -1;
        }

        if (quiz.questiondecimalpoints == -1) {
            return quiz.decimalpoints;
        }

        return quiz.questiondecimalpoints;
    }

    /**
     * Gets a quiz grade and feedback from the gradebook.
     *
     * @param {number} courseId Course ID.
     * @param {number} moduleId Quiz module ID.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved with an object containing the grade and the feedback.
     */
    getGradeFromGradebook(courseId: number, moduleId: number, ignoreCache?: boolean, siteId?: string, userId?: number)
            : Promise<any> {

        return this.gradesHelper.getGradeModuleItems(courseId, moduleId, userId, null, siteId, ignoreCache).then((items) => {
            return items.shift();
        });
    }

    /**
     * Given a list of attempts, returns the last finished attempt.
     *
     * @param {any[]} attempts Attempts.
     * @return {any} Last finished attempt.
     */
    getLastFinishedAttemptFromList(attempts: any[]): any {
        if (attempts && attempts.length) {
            for (let i = attempts.length - 1; i >= 0; i--) {
                const attempt = attempts[i];

                if (this.isAttemptFinished(attempt.state)) {
                    return attempt;
                }
            }
        }
    }

    /**
     * Given a list of questions, check if the quiz can be submitted.
     * Will return an array with the messages to prevent the submit. Empty array if quiz can be submitted.
     *
     * @param {any[]} questions Questions.
     * @return {string[]} List of prevent submit messages. Empty array if quiz can be submitted.
     */
    getPreventSubmitMessages(questions: any[]): string[] {
        const messages = [];

        questions.forEach((question) => {
            let message = this.questionDelegate.getPreventSubmitMessage(question);
            if (message) {
                message = this.translate.instant(message);
                messages.push(this.translate.instant('core.question.questionmessage', {$a: question.slot, $b: message}));
            }
        });

        return messages;
    }

    /**
     * Get cache key for quiz data WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string} Cache key.
     */
    protected getQuizDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'quiz:' + courseId;
    }

    /**
     * Get a Quiz with key=value. If more than one is found, only the first will be returned.
     *
     * @param {number} courseId Course ID.
     * @param {string} key Name of the property to check.
     * @param {any} value Value to search.
     * @param {boolean} [forceCache] Whether it should always return cached data.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the Quiz is retrieved.
     */
    protected getQuizByField(courseId: number, key: string, value: any, forceCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseids: [courseId]
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getQuizDataCacheKey(courseId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read('mod_quiz_get_quizzes_by_courses', params, preSets).then((response) => {
                if (response && response.quizzes) {
                    // Search the quiz.
                    for (const i in response.quizzes) {
                        const quiz = response.quizzes[i];
                        if (quiz[key] == value) {
                            return quiz;
                        }
                    }
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a quiz by module ID.
     *
     * @param {number} courseId Course ID.
     * @param {number} cmId Course module ID.
     * @param {boolean} [forceCache] Whether it should always return cached data.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the quiz is retrieved.
     */
    getQuiz(courseId: number, cmId: number, forceCache?: boolean, siteId?: string): Promise<any> {
        return this.getQuizByField(courseId, 'coursemodule', cmId, forceCache, siteId);
    }

    /**
     * Get a quiz by quiz ID.
     *
     * @param {number} courseId Course ID.
     * @param {number} id Quiz ID.
     * @param {boolean} [forceCache] Whether it should always return cached data.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the quiz is retrieved.
     */
    getQuizById(courseId: number, id: number, forceCache?: boolean, siteId?: string): Promise<any> {
        return this.getQuizByField(courseId, 'id', id, forceCache, siteId);
    }

    /**
     * Get cache key for get quiz access information WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @return {string} Cache key.
     */
    protected getQuizAccessInformationCacheKey(quizId: number): string {
        return this.ROOT_CACHE_KEY + 'quizAccessInformation:' + quizId;
    }

    /**
     * Get access information for an attempt.
     *
     * @param {number} quizId Quiz ID.
     * @param {boolean} [offline] Whether it should return cached data. Has priority over ignoreCache.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the access information.
     */
    getQuizAccessInformation(quizId: number, offline?: boolean, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    quizid: quizId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getQuizAccessInformationCacheKey(quizId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_quiz_get_quiz_access_information', params, preSets);
        });
    }

    /**
     * Get a readable Quiz grade method.
     *
     * @param {number|string} method Grading method.
     * @return {string} Readable grading method.
     */
    getQuizGradeMethod(method: number | string): string {
        if (typeof method == 'string') {
            method = parseInt(method, 10);
        }

        switch (method) {
            case AddonModQuizProvider.GRADEHIGHEST:
                return this.translate.instant('addon.mod_quiz.gradehighest');
            case AddonModQuizProvider.GRADEAVERAGE:
                return this.translate.instant('addon.mod_quiz.gradeaverage');
            case AddonModQuizProvider.ATTEMPTFIRST:
                return this.translate.instant('addon.mod_quiz.attemptfirst');
            case AddonModQuizProvider.ATTEMPTLAST:
                return this.translate.instant('addon.mod_quiz.attemptlast');
            default:
                return '';
        }
    }

    /**
     * Get cache key for get quiz required qtypes WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @return {string} Cache key.
     */
    protected getQuizRequiredQtypesCacheKey(quizId: number): string {
        return this.ROOT_CACHE_KEY + 'quizRequiredQtypes:' + quizId;
    }

    /**
     * Get the potential question types that would be required for a given quiz.
     *
     * @param {number} quizId Quiz ID.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the access information.
     */
    getQuizRequiredQtypes(quizId: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    quizid: quizId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getQuizRequiredQtypesCacheKey(quizId)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_quiz_get_quiz_required_qtypes', params, preSets).then((response) => {
                if (response && response.questiontypes) {
                    return response.questiontypes;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Given an attempt's layout, return the list of pages.
     *
     * @param {string} layout Attempt's layout.
     * @return {number[]} Pages.
     * @description
     * An attempt's layout is a string with the question numbers separated by commas. A 0 indicates a change of page.
     * Example: 1,2,3,0,4,5,6,0
     * In the example above, first page has questions 1, 2 and 3. Second page has questions 4, 5 and 6.
     *
     * This function returns a list of pages.
     */
    getPagesFromLayout(layout: string): number[] {
        const split = layout.split(','),
            pages: number[] = [];
        let page = 0;

        for (let i = 0; i < split.length; i++) {
            if (split[i] == '0') {
                pages.push(page);
                page++;
            }
        }

        return pages;
    }

    /**
     * Given an attempt's layout and a list of questions identified by question slot,
     * return the list of pages that have at least 1 of the questions.
     *
     * @param {string} layout Attempt's layout.
     * @param {any} questions List of questions. It needs to be an object where the keys are question slot.
     * @return {number[]} Pages.
     * @description
     * An attempt's layout is a string with the question numbers separated by commas. A 0 indicates a change of page.
     * Example: 1,2,3,0,4,5,6,0
     * In the example above, first page has questions 1, 2 and 3. Second page has questions 4, 5 and 6.
     *
     * This function returns a list of pages.
     */
    getPagesFromLayoutAndQuestions(layout: string, questions: any): number[] {
        const split = layout.split(','),
            pages: number[] = [];
        let page = 0,
            pageAdded = false;

        for (let i = 0; i < split.length; i++) {
            const value = Number(split[i]);

            if (value == 0) {
                page++;
                pageAdded = false;
            } else if (!pageAdded && questions[value]) {
                pages.push(page);
                pageAdded = true;
            }
        }

        return pages;
    }

    /**
     * Given a list of question types, returns the types that aren't supported.
     *
     * @param {string[]} questionTypes Question types to check.
     * @return {string[]} Not supported question types.
     */
    getUnsupportedQuestions(questionTypes: string[]): string[] {
        const notSupported = [];

        questionTypes.forEach((type) => {
            if (type != 'random' && !this.questionDelegate.isQuestionSupported(type)) {
                notSupported.push(type);
            }
        });

        return notSupported;
    }

    /**
     * Given a list of access rules names, returns the rules that aren't supported.
     *
     * @param {string[]} rulesNames Rules to check.
     * @return {string[]} Not supported rules names.
     */
    getUnsupportedRules(rulesNames: string[]): string[] {
        const notSupported = [];

        rulesNames.forEach((name) => {
            if (!this.accessRulesDelegate.isAccessRuleSupported(name)) {
                notSupported.push(name);
            }
        });

        return notSupported;
    }

    /**
     * Get cache key for get user attempts WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} userId User ID.
     * @return {string} Cache key.
     */
    protected getUserAttemptsCacheKey(quizId: number, userId: number): string {
        return this.getUserAttemptsCommonCacheKey(quizId) + ':' + userId;
    }

    /**
     * Get common cache key for get user attempts WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @return {string} Cache key.
     */
    protected getUserAttemptsCommonCacheKey(quizId: number): string {
        return this.ROOT_CACHE_KEY + 'userAttempts:' + quizId;
    }

    /**
     * Get quiz attempts for a certain user.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} [status=all]  Status of the attempts to get. By default, 'all'.
     * @param {boolean} [includePreviews=true] Whether to include previews. Defaults to true.
     * @param {boolean} [offline] Whether it should return cached data. Has priority over ignoreCache.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any[]>} Promise resolved with the attempts.
     */
    getUserAttempts(quizId: number, status: string = 'all', includePreviews: boolean = true, offline?: boolean,
            ignoreCache?: boolean, siteId?: string, userId?: number): Promise<any[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    quizid: quizId,
                    userid: userId,
                    status: status,
                    includepreviews: includePreviews ? 1 : 0
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getUserAttemptsCacheKey(quizId, userId)
                };

            if (offline) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_quiz_get_user_attempts', params, preSets).then((response) => {
                if (response && response.attempts) {
                    return response.attempts;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get user best grade WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} userId User ID.
     * @return {string} Cache key.
     */
    protected getUserBestGradeCacheKey(quizId: number, userId: number): string {
        return this.getUserBestGradeCommonCacheKey(quizId) + ':' + userId;
    }

    /**
     * Get common cache key for get user best grade WS calls.
     *
     * @param {number} quizId Quiz ID.
     * @return {string} Cache key.
     */
    protected getUserBestGradeCommonCacheKey(quizId: number): string {
        return this.ROOT_CACHE_KEY + 'userBestGrade:' + quizId;
    }

    /**
     * Get best grade in a quiz for a certain user.
     *
     * @param {number} quizId Quiz ID.
     * @param {boolean} [ignoreCache] Whether it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved with the attempts.
     */
    getUserBestGrade(quizId: number, ignoreCache?: boolean, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    quizid: quizId,
                    userid: userId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getUserBestGradeCacheKey(quizId, userId)
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_quiz_get_user_best_grade', params, preSets);
        });
    }

    /**
     * Invalidates all the data related to a certain quiz.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} [courseId] Course ID.
     * @param {number} [attemptId] Attempt ID to invalidate some WS calls.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAllQuizData(quizId: number, courseId?: number, attemptId?: number, siteId?: string, userId?: number): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        promises.push(this.invalidateAttemptAccessInformation(quizId, siteId));
        promises.push(this.invalidateCombinedReviewOptionsForUser(quizId, siteId, userId));
        promises.push(this.invalidateFeedback(quizId, siteId));
        promises.push(this.invalidateQuizAccessInformation(quizId, siteId));
        promises.push(this.invalidateQuizRequiredQtypes(quizId, siteId));
        promises.push(this.invalidateUserAttemptsForUser(quizId, siteId, userId));
        promises.push(this.invalidateUserBestGradeForUser(quizId, siteId, userId));

        if (attemptId) {
            promises.push(this.invalidateAttemptData(attemptId, siteId));
            promises.push(this.invalidateAttemptReview(attemptId, siteId));
            promises.push(this.invalidateAttemptSummary(attemptId, siteId));
        }

        if (courseId) {
            promises.push(this.invalidateGradeFromGradebook(courseId, siteId, userId));
        }

        return Promise.all(promises);
    }

    /**
     * Invalidates attempt access information for all attempts in a quiz.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAttemptAccessInformation(quizId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getAttemptAccessInformationCommonCacheKey(quizId));
        });
    }

    /**
     * Invalidates attempt access information for an attempt.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} attemptId Attempt ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAttemptAccessInformationForAttempt(quizId: number, attemptId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAttemptAccessInformationCacheKey(quizId, attemptId));
        });
    }

    /**
     * Invalidates attempt data for all pages.
     *
     * @param {number} attemptId Attempt ID.
     * @param {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAttemptData(attemptId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getAttemptDataCommonCacheKey(attemptId));
        });
    }

    /**
     * Invalidates attempt data for a certain page.
     *
     * @param {number} attemptId Attempt ID.
     * @param {number} page Page.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAttemptDataForPage(attemptId: number, page: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAttemptDataCacheKey(attemptId, page));
        });
    }

    /**
     * Invalidates attempt review for all pages.
     *
     * @param {number} attemptId Attempt ID.
     * @param {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAttemptReview(attemptId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getAttemptReviewCommonCacheKey(attemptId));
        });
    }

    /**
     * Invalidates attempt review for a certain page.
     *
     * @param {number} attemptId Attempt ID.
     * @param {number} page Page.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAttemptReviewForPage(attemptId: number, page: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAttemptReviewCacheKey(attemptId, page));
        });
    }

    /**
     * Invalidates attempt summary.
     *
     * @param {number} attemptId Attempt ID.
     * @param {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAttemptSummary(attemptId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAttemptSummaryCacheKey(attemptId));
        });
    }

    /**
     * Invalidates combined review options for all users.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateCombinedReviewOptions(quizId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getCombinedReviewOptionsCommonCacheKey(quizId));
        });
    }

    /**
     * Invalidates combined review options for a certain user.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateCombinedReviewOptionsForUser(quizId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getCombinedReviewOptionsCacheKey(quizId, userId));
        });
    }

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use AddonModQuizProvider.invalidateFiles.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Get required data to call the invalidate functions.
       return this.getQuiz(courseId, moduleId, false, siteId).then((quiz) => {
            return this.getUserAttempts(quiz.id, 'all', true, false, false, siteId).then((attempts) => {
                // Now invalidate it.
                const lastAttemptId = attempts.length ? attempts[attempts.length - 1].id : undefined;

                return this.invalidateAllQuizData(quiz.id, courseId, lastAttemptId, siteId);
            });
        });
    }

    /**
     * Invalidates feedback for all grades of a quiz.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateFeedback(quizId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getFeedbackForGradeCommonCacheKey(quizId));
        });
    }

    /**
     * Invalidates feedback for a certain grade.
     *
     * @param {number} quizId Quiz ID.
     * @param {number} grade Grade.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateFeedbackForGrade(quizId: number, grade: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getFeedbackForGradeCacheKey(quizId, grade));
        });
    }

    /**
     * Invalidate the prefetched files.
     *
     * @param {number} moduleId The module ID.
     * @return {Promise<any>} Promise resolved when the files are invalidated.
     */
    invalidateFiles(moduleId: number): Promise<any> {
        return this.filepoolProvider.invalidateFilesByComponent(this.sitesProvider.getCurrentSiteId(),
                AddonModQuizProvider.COMPONENT, moduleId);
    }

    /**
     * Invalidates grade from gradebook for a certain user.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateGradeFromGradebook(courseId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return this.gradesHelper.invalidateGradeModuleItems(courseId, userId, null, siteId);
        });
    }

    /**
     * Invalidates quiz access information for a quiz.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateQuizAccessInformation(quizId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getQuizAccessInformationCacheKey(quizId));
        });
    }

    /**
     * Invalidates required qtypes for a quiz.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateQuizRequiredQtypes(quizId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getQuizRequiredQtypesCacheKey(quizId));
        });
    }

    /**
     * Invalidates user attempts for all users.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateUserAttempts(quizId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getUserAttemptsCommonCacheKey(quizId));
        });
    }

    /**
     * Invalidates user attempts for a certain user.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateUserAttemptsForUser(quizId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getUserAttemptsCacheKey(quizId, userId));
        });
    }

    /**
     * Invalidates user best grade for all users.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateUserBestGrade(quizId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getUserBestGradeCommonCacheKey(quizId));
        });
    }

    /**
     * Invalidates user best grade for a certain user.
     *
     * @param {number} quizId Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined use site's current user.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateUserBestGradeForUser(quizId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getUserBestGradeCacheKey(quizId, userId));
        });
    }

    /**
     * Invalidates quiz data.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateQuizData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getQuizDataCacheKey(courseId));
        });
    }

    /**
     * Check if an attempt is finished based on its state.
     *
     * @param {string} state Attempt's state.
     * @return {boolean} Whether it's finished.
     */
    isAttemptFinished(state: string): boolean {
        return state == AddonModQuizProvider.ATTEMPT_FINISHED || state == AddonModQuizProvider.ATTEMPT_ABANDONED;
    }

    /**
     * Check if an attempt is finished in offline but not synced.
     *
     * @param {number} attemptId Attempt ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: true if finished in offline but not synced, false otherwise.
     */
    isAttemptFinishedOffline(attemptId: number, siteId?: string): Promise<boolean> {
        return this.quizOfflineProvider.getAttemptById(attemptId, siteId).then((attempt) => {
            return !!attempt.finished;
        }).catch(() => {
            return false;
        });
    }

    /**
     * Check if an attempt is nearly over. We consider an attempt nearly over or over if:
     * - Is not in progress
     * OR
     * - It finished before autosaveperiod passes.
     *
     * @param {any} quiz Quiz.
     * @param {any} attempt Attempt.
     * @return {boolean} Whether it's nearly over or over.
     */
    isAttemptTimeNearlyOver(quiz: any, attempt: any): boolean {
        if (attempt.state != AddonModQuizProvider.ATTEMPT_IN_PROGRESS) {
            // Attempt not in progress, return true.
            return true;
        }

        const dueDate = this.getAttemptDueDate(quiz, attempt),
            autoSavePeriod = quiz.autosaveperiod || 0;

        if (dueDate > 0 && Date.now() + autoSavePeriod >= dueDate) {
            return true;
        }

        return false;
    }

    /**
     * Check if last attempt is offline and unfinished.
     *
     * @param {number} attemptId Attempt ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined, user current site's user.
     * @return {Promise<boolean>} Promise resolved with boolean: true if last offline attempt is unfinished, false otherwise.
     */
    isLastAttemptOfflineUnfinished(quiz: any, siteId?: string, userId?: number): Promise<boolean> {
        return this.quizOfflineProvider.getQuizAttempts(quiz.id, siteId, userId).then((attempts) => {
            const last = attempts.pop();

            return last && !last.finished;
        }).catch(() => {
            return false;
        });
    }

    /**
     * Check if a quiz navigation is sequential.
     *
     * @param {any} quiz Quiz.
     * @return {boolean} Whether navigation is sequential.
     */
    isNavigationSequential(quiz: any): boolean {
        return quiz.navmethod == 'sequential';
    }

    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the quiz WS are available.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {boolean} Whether the plugin is enabled.
     */
    isPluginEnabled(siteId?: string): boolean {
        // Quiz WebServices were introduced in 3.1, it will always be enabled.
        return true;
    }

    /**
     * Check if a question is blocked.
     *
     * @param {any} question Question.
     * @return {boolean} Whether it's blocked.
     */
    isQuestionBlocked(question: any): boolean {
        this.div.innerHTML = question.html;

        return !!this.div.querySelector('.mod_quiz-blocked_question_warning');
    }

    /**
     * Check if a quiz is enabled to be used in offline.
     *
     * @param {any} quiz Quiz.
     * @return {boolean} Whether offline is enabled.
     */
    isQuizOffline(quiz: any): boolean {
        return !!quiz.allowofflineattempts;
    }

    /**
     * Given a list of attempts, add finishedOffline=true to those attempts that are finished in offline but not synced.
     *
     * @param {any[]} attempts List of attempts.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<void>} Promise resolved when done.
     */
    loadFinishedOfflineData(attempts: any[], siteId?: string): Promise<void> {
        if (attempts.length) {
            // We only need to check the last attempt because the user can only have 1 local attempt.
            const lastAttempt = attempts[attempts.length - 1];

            return this.isAttemptFinishedOffline(lastAttempt.id, siteId).then((finished) => {
                lastAttempt.finishedOffline = finished;
            });
        }

        return Promise.resolve();
    }

    /**
     * Report an attempt as being viewed.
     *
     * @param {number} attemptId Attempt ID.
     * @param {number} [page=0] Page number.
     * @param {any} [preflightData] Preflight required data (like password).
     * @param {boolean} [offline] Whether attempt is offline.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    logViewAttempt(attemptId: number, page: number = 0, preflightData: any = {}, offline?: boolean): Promise<any> {
        const params = {
                attemptid: attemptId,
                page: page,
                preflightdata: this.utils.objectToArrayOfObjects(preflightData, 'name', 'value', true)
            },
            promises = [];

        promises.push(this.sitesProvider.getCurrentSite().write('mod_quiz_view_attempt', params));
        if (offline) {
            promises.push(this.quizOfflineProvider.setAttemptCurrentPage(attemptId, page));
        }

        return Promise.all(promises);
    }

    /**
     * Report an attempt's review as being viewed.
     *
     * @param {number} attemptId Attempt ID.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    logViewAttemptReview(attemptId: number): Promise<any> {
        const params = {
            attemptid: attemptId
        };

        return this.sitesProvider.getCurrentSite().write('mod_quiz_view_attempt_review', params);
    }

    /**
     * Report an attempt's summary as being viewed.
     *
     * @param {number} attemptId Attempt ID.
     * @param {any} preflightData Preflight required data (like password).
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    logViewAttemptSummary(attemptId: number, preflightData: any): Promise<any> {
        const params = {
            attemptid: attemptId,
            preflightdata: this.utils.objectToArrayOfObjects(preflightData, 'name', 'value', true)
        };

        return this.sitesProvider.getCurrentSite().write('mod_quiz_view_attempt_summary', params);
    }

    /**
     * Report a quiz as being viewed.
     *
     * @param {number} id Module ID.
     * @return {Promise<any>} Promise resolved when the WS call is successful.
     */
    logViewQuiz(id: number): Promise<any> {
        const params = {
            quizid: id
        };

        return this.sitesProvider.getCurrentSite().write('mod_quiz_view_quiz', params);
    }

    /**
     * Process an attempt, saving its data.
     *
     * @param {any} quiz Quiz.
     * @param {any} attempt Attempt.
     * @param {any} data Data to save.
     * @param {any} preflightData Preflight required data (like password).
     * @param {boolean} [finish] Whether to finish the quiz.
     * @param {boolean} [timeUp] Whether the quiz time is up, false otherwise.
     * @param {boolean} [offline] Whether the attempt is offline.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved in success, rejected otherwise.
     */
    processAttempt(quiz: any, attempt: any, data: any, preflightData: any, finish?: boolean, timeUp?: boolean, offline?: boolean,
            siteId?: string): Promise<any> {
        if (offline) {
            return this.processAttemptOffline(quiz, attempt, data, preflightData, finish, siteId);
        }

        return this.processAttemptOnline(attempt.id, data, preflightData, finish, timeUp, siteId);
    }

    /**
     * Process an online attempt, saving its data.
     *
     * @param {number} attemptId Attempt ID.
     * @param {any} data Data to save.
     * @param {any} preflightData Preflight required data (like password).
     * @param {boolean} [finish] Whether to finish the quiz.
     * @param {boolean} [timeUp] Whether the quiz time is up, false otherwise.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved in success, rejected otherwise.
     */
    protected processAttemptOnline(attemptId: number, data: any, preflightData: any, finish?: boolean, timeUp?: boolean,
            siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                attemptid: attemptId,
                data: this.utils.objectToArrayOfObjects(data, 'name', 'value'),
                finishattempt: finish ? 1 : 0,
                timeup: timeUp ? 1 : 0,
                preflightdata: this.utils.objectToArrayOfObjects(preflightData, 'name', 'value')
            };

            return site.write('mod_quiz_process_attempt', params).then((response) => {
                if (response && response.warnings && response.warnings.length) {
                    // Reject with the first warning.
                    return Promise.reject(response.warnings[0]);
                } else if (response && response.state) {
                    return response.state;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Process an offline attempt, saving its data.
     *
     * @param {any} quiz Quiz.
     * @param {any} attempt Attempt.
     * @param {any} data Data to save.
     * @param {any} preflightData Preflight required data (like password).
     * @param {boolean} [finish] Whether to finish the quiz.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved in success, rejected otherwise.
     */
    protected processAttemptOffline(quiz: any, attempt: any, data: any, preflightData: any, finish?: boolean, siteId?: string)
            : Promise<any> {

        // Get attempt summary to have the list of questions.
        return this.getAttemptSummary(attempt.id, preflightData, true, false, true, siteId).then((questionArray) => {
            // Convert the question array to an object.
            const questions = this.utils.arrayToObject(questionArray, 'slot');

            return this.quizOfflineProvider.processAttempt(quiz, attempt, questions, data, finish, siteId);
        });
    }

    /**
     * Check if it's a graded quiz. Based on Moodle's quiz_has_grades.
     *
     * @param {any} quiz Quiz.
     * @return {boolean} Whether quiz is graded.
     */
    quizHasGrades(quiz: any): boolean {
        return quiz.grade >= 0.000005 && quiz.sumgrades >= 0.000005;
    }

    /**
     * Convert the raw grade into a grade out of the maximum grade for this quiz.
     * Based on Moodle's quiz_rescale_grade.
     *
     * @param {string} rawGrade The unadjusted grade, for example attempt.sumgrades.
     * @param {any} quiz Quiz.
     * @param {boolean|string} format True to format the results for display, 'question' to format a question grade
     *                                 (different number of decimal places), false to not format it.
     * @return {string} Grade to display.
     */
    rescaleGrade(rawGrade: string, quiz: any, format: boolean | string = true): string {
        let grade: number;

        const rawGradeNum = parseFloat(rawGrade);
        if (!isNaN(rawGradeNum)) {
            if (quiz.sumgrades >= 0.000005) {
                grade = rawGradeNum * quiz.grade / quiz.sumgrades;
            } else {
                grade = 0;
            }
        }

        if (format === 'question') {
            return this.formatGrade(grade, this.getGradeDecimals(quiz));
        } else if (format) {
            return this.formatGrade(grade, quiz.decimalpoints);
        }

        return String(grade);
    }

    /**
     * Save an attempt data.
     *
     * @param {any} quiz Quiz.
     * @param {any} attempt Attempt.
     * @param {any} data Data to save.
     * @param {any} preflightData Preflight required data (like password).
     * @param {boolean} [offline] Whether attempt is offline.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved in success, rejected otherwise.
     */
    saveAttempt(quiz: any, attempt: any, data: any, preflightData: any, offline?: boolean, siteId?: string): Promise<any> {
        try {
            if (offline) {
                return this.processAttemptOffline(quiz, attempt, data, preflightData, false, siteId);
            }

            return this.saveAttemptOnline(attempt.id, data, preflightData, siteId);
        } catch (ex) {
            this.logger.error(ex);

            return Promise.reject(null);
        }
    }

    /**
     * Save an attempt data.
     *
     * @param {number} attemptId Attempt ID.
     * @param {any} data Data to save.
     * @param {any} preflightData Preflight required data (like password).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<void>} Promise resolved in success, rejected otherwise.
     */
    protected saveAttemptOnline(attemptId: number, data: any, preflightData: any, siteId?: string): Promise<void> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                attemptid: attemptId,
                data: this.utils.objectToArrayOfObjects(data, 'name', 'value'),
                preflightdata: this.utils.objectToArrayOfObjects(preflightData, 'name', 'value')
            };

            return site.write('mod_quiz_save_attempt', params).then((response) => {
                if (response && response.warnings && response.warnings.length) {
                    // Reject with the first warning.
                    return Promise.reject(response.warnings[0]);
                } else if (!response || !response.status) {
                    return Promise.reject(null);
                }
            });
        });
    }

    /**
     * Check if time left should be shown.
     *
     * @param {string[]} rules List of active rules names.
     * @param {any} attempt Attempt.
     * @param {number} endTime The attempt end time (in seconds).
     * @return {boolean} Whether time left should be displayed.
     */
    shouldShowTimeLeft(rules: string[], attempt: any, endTime: number): boolean {
        const timeNow = this.timeUtils.timestamp();

        if (attempt.state != AddonModQuizProvider.ATTEMPT_IN_PROGRESS) {
            return false;
        }

        return this.accessRulesDelegate.shouldShowTimeLeft(rules, attempt, endTime, timeNow);
    }

    /**
     * Start an attempt.
     *
     * @param {number} quizId Quiz ID.
     * @param {any} preflightData Preflight required data (like password).
     * @param {boolean} [forceNew] Whether to force a new attempt or not.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the attempt data.
     */
    startAttempt(quizId: number, preflightData: any, forceNew?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    quizid: quizId,
                    preflightdata: this.utils.objectToArrayOfObjects(preflightData, 'name', 'value', true),
                    forcenew: forceNew ? 1 : 0
                };

            return site.write('mod_quiz_start_attempt', params).then((response) => {
                if (response && response.warnings && response.warnings.length) {
                    // Reject with the first warning.
                    return Promise.reject(response.warnings[0]);
                } else if (response && response.attempt) {
                    return response.attempt;
                }

                return Promise.reject(null);
            });
        });
    }
}
