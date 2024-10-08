import { DX3rdWorksSheet } from "./works-sheet.js";

export class DX3rdAttributesSheet extends DX3rdWorksSheet {

  /** @override */
  async getData(options) {
    let data = await super.getData(options);

    if (this.actor != null)
      data.system.actorSkills = duplicate(this.actor.system.attributes.skills);
    else
      data.system.actorSkills = duplicate(game.DX3rd.baseSkills);

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html.find(".attributes").on("click", "a.attribute-control", this._onClickAttributeControl.bind(this));
  }

  /* -------------------------------------------- */

  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const pos = a.dataset.pos;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      let attr = 'system.attributes'
      if (pos != "main")
        attr = 'system.effect.attributes';

      if ($(form).find(`select[name='${attr}.-.key']`).length != 0)
        return;

      let newKey = document.createElement("div");
      const skill = `<input type="hidden" name="${attr}.-.key" value="-"/>`;
      newKey.innerHTML = skill;

      newKey = newKey.children[0];
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if ( action === "delete" ) {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = this.updateAttributes(formData);
    return formData;
  }

  updateAttributes(formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).system.attributes || {};

    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];
      
      try {
        if (k != "-") {
          let num = v.value.replace("@level", 0);
          math.evaluate(num);
        }
      } catch (error) {
        ui.notifications.error(v.value + ": Values other than formula, @level are not allowed.");
      }

      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    for ( let k of Object.keys(this.object.system.attributes) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.attributes")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "system.attributes": attributes});

    return formData;
  }


}