
export class DX3rdItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dx3rd", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }
  
  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/dx3rd/templates/sheet/item";
    return `${path}/${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    let isOwner = false;
    let isEditable = this.isEditable;

    const data = super.getData(options);
    let items = {};
    let effects = {};
    let actor = null;

    data.system = this.document.system;
    isOwner = this.document.isOwner;
    isEditable = this.isEditable;

    data.enrichedBiography = await TextEditor.enrichHTML(this.object.system.description, {async: true});

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    //html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
  }

  /* -------------------------------------------- */


}