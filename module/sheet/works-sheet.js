import { DX3rdItemSheet } from "./item-sheet.js";

export class DX3rdWorksSheet extends DX3rdItemSheet {

  /** @override */
  async getData(options) {
    let data = await super.getData(options);

    if (this.actor != null)
      data.data.actorSkills = duplicate(this.actor.data.data.attributes.skills);
    else
      data.data.actorSkills = duplicate(game.DX3rd.baseSkills);

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html.find(".add-skills").on("click", ".skill-create", this._onSkillCreate.bind(this));
    html.find(".skills").on("click", "a.attribute-control", this._onClickAttributeControl.bind(this));
  }

  /* -------------------------------------------- */

  async _onSkillCreate(event) {
    let key = this.item.data.data.skillTmp;

    let newKey = document.createElement("div");
    const skill = `<input type="hidden" name="data.skills.${key}.key" value="${key}"/>`;
    newKey.innerHTML = skill;

    newKey = newKey.children[0];
    this.form.appendChild(newKey);
    await this._onSubmit(event);
  }


  /* -------------------------------------------- */

  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const type = a.dataset.type;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      if ($(form).find("input[name='data.skills.-.key']").length != 0)
        return;

      let newKey = document.createElement("div");
      const skill = `<input type="hidden" name="data.skills.-.key" value="-"/>`;
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
  _updateObject(event, formData) {
    formData = this.updateAttributes(formData);

    // Update the Item
    return this.object.update(formData);
  }

  updateAttributes(formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).data.skills || {};

    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    for ( let k of Object.keys(this.object.data.data.skills) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("data.skills")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "data.skills": attributes});

    return formData;
  }




}