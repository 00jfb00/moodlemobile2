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

angular.module('mm.addons.qtype_calculatedsimple')

/**
 * Directive to render a calculated simple question.
 *
 * @module mm.addons.qtype_calculatedsimple
 * @ngdoc directive
 * @name mmaQtypeCalculatedSimple
 */
.directive('mmaQtypeCalculatedSimple', function($log, $mmQuestionHelper) {
	$log = $log.getInstance('mmaQtypeCalculatedSimple');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/qtype/calculated/template.html',
        link: function(scope) {
            $mmQuestionHelper.calculatedDirective(scope, $log);
        }
    };
});
