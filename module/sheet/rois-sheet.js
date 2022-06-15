import { DX3rdItemSheet } from "./item-sheet.js";

export class DX3rdRoisSheet extends DX3rdItemSheet {

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html.find(".show-actor").click(this._onShowActor.bind(this));
  }

  async _onShowActor(event) {
    event.preventDefault();

    let actorId = this.object.data.data.actor;
    let actor = game.actors.get(actorId);
  	actor.sheet.render(true);
  }

}