import { DX3rdAttributesSheet } from "./attributes-sheet.js";

export class DX3rdEffectSheet extends DX3rdAttributesSheet {

	/** @override */
  _updateObject(event, formData) {
    formData = this.updateAttributes(formData);
    formData = this.updateEffectAttributes(formData);

    // Update the Item
    return this.object.update(formData);
  }

  updateEffectAttributes(formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).data.effect.attributes || {};

    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    if (this.object.data.data.effect.attributes != null)
    for ( let k of Object.keys(this.object.data.data.effect.attributes) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("data.effect.attributes")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "data.effect.attributes": attributes});

    return formData;
  }

}