import Polyglot from 'node-polyglot';

import en from './locales/en.json';
import { SDKError } from 'snipcart-sdk/core/models/SDKError';

export interface LocalizationService {
    language: string;
    localize: (phrase: string, opts?: any) => string;
    localizeError: (error: SDKError) => ErrorMessage;
    exists(key: string): boolean;
}

// tslint:disable-next-line:class-name
export default class i18n implements LocalizationService {
    public language: string;
    private polyglot: Polyglot;

    constructor(language: string) {
        this.language = language;

        this.polyglot = new Polyglot({
            locale: language,
            phrases: en,
        });
    }

    localize(phrase: string, opts?: any | undefined): string {
        return this.polyglot.t(phrase, opts);
    }

    localizeError(error: SDKError): ErrorMessage {
        return new LocalizedError(error, this);
    }

    exists(key: string): boolean {
        return this.polyglot.has(key);
    }
}

export interface ErrorMessage{
    title:string;
    description: string;
}

// DISCUSS : What do we think about this structure?
class LocalizedError implements ErrorMessage{
    title: string;
    description: string;

    constructor(error: SDKError, i18n: LocalizationService) {

        var parts = error.code.split('.');

        this.title = '';
        this.description = '';

        console.log(parts);

        if(parts.length <= 2
            || parts[0] != 'snipcart' 
            || parts[1] != 'errors'){

            this.title = i18n.localize('errors.default');
            
        }
        else if(parts.length > 2){
            const errorSubject = parts[2]
            if(parts.length === 3){
                this.title = i18n.localize(`errors.${errorSubject}`)
            }
            else{
                this.title = i18n.localize(`errors.${errorSubject}.title`)
                this.description = i18n.localize(`errors.${errorSubject}.${parts[3]}`);
            }
        }
    }
}
