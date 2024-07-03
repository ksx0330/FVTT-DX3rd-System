
export class DisableHooks {
    static init() {
        Hooks.on("afterRoll", async actor => {
            await this.disableTalents(actor, ['roll']);
        });

        Hooks.on("afterMajor", async actor => {
            await this.disableTalents(actor, ['roll', 'major']);
        });

        Hooks.on("afterReaction", async actor => {
            await this.disableTalents(actor, ['roll', 'reaction']);
        });

        Hooks.on("afterRound", async actors => {
            for (let actor of actors)
                await this.disableTalents(actor, ['roll','major', 'reaction', 'round'], ['round']);
        });

        Hooks.on("afterCombat", async actors => {
            for (let actor of actors)
                await this.disableTalents(actor, ['roll','major', 'reaction', 'round', 'battle'], ['round', 'battle']);
        });

        Hooks.on("afterSession", async () => {
            for (let actor of game.actors) {
                await this.disableTalents(actor, ['roll','major', 'reaction', 'round', 'battle'], ['round', 'battle', 'session']);
            }
        });

    }

    static async disableTalents(actor, active, used) {
        for (let item of actor.items) {
            let updates = {};
            if (item.system.active != undefined)
            if (active.findIndex(i => i == item.system.active.disable) != -1)
                updates["system.active.state"] = false;

            if (item.system.used != undefined)
            if (used.findIndex(i => i == item.system.used.disable) != -1)
                updates["system.used.state"] = 0;

            await item.update(updates);
        }

        let updates = {};
        for (let [key, effect] of Object.entries(actor.system.attributes.applied)) {
            if (active.findIndex(i => i == effect.disable) != -1)
                updates[`system.attributes.applied.-=${key}`] = null;
        }
        await actor.update(updates);
    }

}
