
export class DX3rdDiceTerm extends DiceTerm {

    /** @override */
    constructor(termData = []) {
        super(termData);
        this.faces = 10;

        if (termData.modifiers == undefined)
            return;

        this.critical = termData.modifiers[0] == undefined ? 10 : termData.modifiers[0];

    }

    /** @inheritdoc */
    static DENOMINATION = "x";

    /** @inheritdoc */
    _evaluateSync({minimize=false, maximize=false}={}) {
        if (this.number > 999) {
            throw new Error(`You may not evaluate a DiceTerm with more than 999 requested results`);
        }
        for ( let n=1; n <= this.number; n++ ) {
            this.roll({minimize, maximize});
        }
        this._explode();
        return this;
    }

    _explode() {
        let new_result = [];

        let checked = 0;
        let initial = this.results.length;

        let stage = 0;

        while (checked < this.results.length) {
            let r = this.results[checked];
            r.stage = stage;
            checked++;
            if (!r.active) continue;

            if ( (this.critical !== null) && (this.critical <= 0) ) break;
            if (DiceTerm.compareResult(r.result, ">=", this.critical)) {
                r.exploded = true;
                this.roll();
            }

            // Limit recursion
            if (checked == initial) {
                initial = this.results.length;
                stage += 1;
            }
        }


    }


    /** @inheritdoc */
    get total() {
        if (!this._evaluated) return undefined;

        let total = 0;
        let stage = 0, max = 0;
        for (let r of this.results) {
            if (!r.active) continue;
            if (r.stage != stage) {
                stage = r.stage;
                total += max;
                max = 0;
            }

            let n = (r.exploded) ? 10 : r.result;
            max = Math.max(max, n);
        }
        return total + max;
    }

    getTooltipData() {
        let rolls = [];
        let stage = 0, max = 0;

        for (let r of this.results) {
            if (r.stage != stage) {
                rolls.push({
                    result: max,
                    classes: "clear"
                });

                stage = r.stage;
                max = 0;
            }

            max = Math.max(max, (r.exploded) ? 10 : r.result );
            rolls.push({
                result: this.getResultLabel(r),
                classes: this.getResultCSS(r).filterJoin(" ")
            })
        }

        rolls.push({
            result: max,
            classes: "clear"
        });

        return {
            formula: this.expression,
            total: this.total,
            faces: this.faces,
            flavor: this.flavor,
            rolls: rolls
        };
    }

}