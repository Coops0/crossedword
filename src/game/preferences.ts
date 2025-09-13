import { loadPreferences, savePreferences } from './storage.ts';

export class Preferences {
    private _autoCheck: boolean;

    constructor() {
        const preferences = loadPreferences() ?? { autoCheck: false };
        this._autoCheck = preferences.autoCheck;
    }

    private save() {
        savePreferences(this._autoCheck);
    }

    get autoCheck(): boolean {
        return this._autoCheck;
    }

    set autoCheck(value: boolean) {
        this._autoCheck = value;
        this.save();
    }
}