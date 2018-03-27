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

import { Component, OnInit, Injector } from '@angular/core';
import { CoreQuestionBaseComponent } from '@core/question/classes/base-question-component';

/**
 * Component to render a gap select question.
 */
@Component({
    selector: 'addon-qtype-gapselect',
    templateUrl: 'gapselect.html'
})
export class AddonQtypeGapSelectComponent extends CoreQuestionBaseComponent implements OnInit {

    constructor(injector: Injector) {
        super('AddonQtypeGapSelectComponent', injector);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.initOriginalTextComponent('.qtext');
    }
}
