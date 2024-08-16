import { DX3rdItemSheet } from "./item-sheet.js";

export class DX3rdWorksSheet extends DX3rdItemSheet {

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
    html.find(".add-skills").on("click", ".skill-create", this._onSkillCreate.bind(this));
    html.find(".skills").on("click", "a.attribute-control", this._onClickSKillControl.bind(this));
  }

  /* -------------------------------------------- */

  async _onSkillCreate(event) {
    let key = this.item.system.skillTmp;

    let newKey = document.createElement("div");
    const skill = `<input type="hidden" name="system.skills.${key}.key" value="${key}"/>`;
    newKey.innerHTML = skill;

    newKey = newKey.children[0];
    this.form.appendChild(newKey);
    await this._onSubmit(event);
  }


  /* -------------------------------------------- */

  async _onClickSKillControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const type = a.dataset.type;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      if ($(form).find("input[name='system.skills.-.key']").length != 0)
        return;

      let newKey = document.createElement("div");
      const skill = `<input type="hidden" name="system.skills.-.key" value="-"/>`;
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
    formData = this.updateSkills(formData);
    return formData;
  }

  updateSkills(formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).system.skills || {};

    let attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if ( /[\s\.]/.test(k) ) {
        ui.notifications.error("Attribute keys may not contain spaces or periods");
        return obj;
      }

      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    if (attributes == undefined)
      attributes = this.object.system.skills;

    // Remove attributes which are no longer used
    for ( let k of Object.keys(this.object.system.skills) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.skills")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "system.skills": attributes});

    return formData;
  }




}