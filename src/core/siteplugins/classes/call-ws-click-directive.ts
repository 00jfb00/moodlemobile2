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

import { Injector, Input, OnInit, ElementRef } from '@angular/core';
import { CoreSitePluginsPluginContentComponent } from '../components/plugin-content/plugin-content';
import { CoreSitePluginsCallWSBaseDirective } from './call-ws-directive';

/**
 * Base class for directives to call a WS when the element is clicked.
 *
 * The directives that inherit from this class will call a WS method when the element is clicked.
 *
 * @see CoreSitePluginsCallWSBaseDirective
 */
export class CoreSitePluginsCallWSOnClickBaseDirective extends CoreSitePluginsCallWSBaseDirective implements OnInit {
    @Input() confirmMessage: string; // Message to confirm the action. If not supplied, no confirmation. If empty, default message.

    constructor(element: ElementRef, injector: Injector, protected parentContent: CoreSitePluginsPluginContentComponent) {
        super(element, injector, parentContent);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.element.addEventListener('click', (ev: Event): void => {
            ev.preventDefault();
            ev.stopPropagation();

            if (typeof this.confirmMessage != 'undefined') {
                // Ask for confirm.
                this.domUtils.showConfirm(this.confirmMessage || this.translate.instant('core.areyousure')).then(() => {
                    this.callWS();
                }).catch(() => {
                    // User cancelled, ignore.
                });
            } else {
                this.callWS();
            }
        });
    }

    /**
     * Call a WS.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected callWS(): Promise<any> {
        const modal = this.domUtils.showModalLoading();

        return super.callWS().finally(() => {
            modal.dismiss();
        });
    }
}
