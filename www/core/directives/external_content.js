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

angular.module('mm.core')

/**
 * Directive to handle external content.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmExternalContent
 * @description
 * Directive to handle external content.
 *
 * This directive should be used with any element that links to external content
 * which we want to have available when the app is offline. Typically images and links.
 *
 * It uses {@link $mmFilepool} in the background.
 *
 * Attributes accepted:
 *     - siteid: Reference to the site ID if different than the site the user is connected to.
 */
.directive('mmExternalContent', function($log, $mmFilepool, $mmSite, $mmSitesManager, $mmUtil, $q) {
    $log = $log.getInstance('mmExternalContent');

    /**
     * Handle external content, setting the right URL.
     *
     * @param  {String} siteId        Site ID.
     * @param  {Object} dom           DOM element.
     * @param  {String} targetAttr    Attribute to modify.
     * @param  {String} url           Original URL to treat.
     * @param  {String} [component]   Component
     * @param  {Number} [componentId] Component ID.
     * @param  {Boolean} download     True if URL contents should be downloaded, false if URL should only be fixed.
     */
    function handleExternalContent(siteId, dom, targetAttr, url, component, componentId, download) {

        if (!url || !$mmUtil.isPluginFileUrl(url)) {
            $log.debug('Ignoring non-pluginfile URL: ' + url);
            return;
        }

        // Get the webservice pluginfile URL, we ignore failures here.
        $mmSitesManager.getSite(siteId).then(function(site) {
            var fn;

            if (!download) {
                fn = function() {
                    return $q.when(site.fixPluginfileURL(url))
                };
            } else if (targetAttr === 'src') {
                fn = $mmFilepool.getSrcByUrl;
            } else {
                fn = $mmFilepool.getUrlByUrl;
            }

            fn(siteId, url, component, componentId).then(function(finalUrl) {
                $log.debug('Using URL ' + finalUrl + ' for ' + url);
                dom.setAttribute(targetAttr, finalUrl);
            });
        });
    }

    return {
        restrict: 'A',
        scope: {
            siteid: '='
        },
        link: function(scope, element, attrs) {
            var dom = element[0],
                siteid = scope.siteid || $mmSite.getId(),
                component = attrs.component,
                componentId = attrs.componentId,
                targetAttr,
                observe = false,
                download = true;

            if (dom.tagName === 'A') {
                targetAttr = 'href';
                if (attrs.hasOwnProperty('ngHref')) {
                    observe = true;
                }

            } else if (dom.tagName === 'IMG') {
                targetAttr = 'src';
                if (attrs.hasOwnProperty('ngSrc')) {
                    observe = true;
                }

            } else if (dom.tagName === 'AUDIO' || dom.tagName === 'VIDEO' || dom.tagName === 'SOURCE') {
                targetAttr = 'src';
                download = false;
                if (attrs.hasOwnProperty('ngSrc')) {
                    observe = true;
                }

            } else {
                // Unsupported tag.
                $log.warn('Directive attached to non-supported tag: ' + dom.tagName);
                return;
            }

            if (observe) {
                attrs.$observe(targetAttr, function(url) {
                    if (!url) {
                        return;
                    }
                    handleExternalContent(siteid, dom, targetAttr, url, component, componentId, download);
                });
            } else {
                handleExternalContent(siteid, dom, targetAttr, attrs[targetAttr], component, componentId, download);
            }

        }
    };
});
