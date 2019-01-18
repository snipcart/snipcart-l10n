import Polyglot from "node-polyglot";
import en from "./locales/en.json";

export interface LocalizationService {
    language: string;
    localize: (phrase: string, opts?: any) => string;
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
}