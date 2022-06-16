
import { ComboDialog } from "../dialog/combo-dialog.js";
import { DX3rdSkillDialog } from "../dialog/skill-dialog.js";

export class DX3rdActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dx3rd", "sheet", "actor"],
      template: "systems/dx3rd/templates/sheet/actor/actor-sheet.html",
      width: 850,
      height: 730,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      dragDrop: [{dragSelector: ".items-list .item", dropSelector: null}]
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options) {
    let isOwner = false;
    let isEditable = this.isEditable;
    let data = super.getData(options);
    let items = {};
    let actorData = {};

    isOwner = this.document.isOwner;
    isEditable = this.isEditable;

    // The Actor's data
    actorData = this.actor.data.toObject(false);
    data.actor = actorData;
    data.data = actorData.data;

    // Owned Items
    data.items = Array.from(this.actor.items.values());
    data.items = data.items.map( i => {
      i.data.id = i.id;
      return i.data;
    });

    data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    this._prepareCharacterItems(data, data.items);

    let rollType = actorData.data.attributes.dice.view;
    data.dice = actorData.data.attributes.dice.value + Number(actorData.data.attributes[rollType].dice) + Number(actorData.data.attributes.encroachment.dice)
    data.critical =actorData.data.attributes.critical.value + actorData.data.attributes[rollType].critical
    data.add = actorData.data.attributes.add.value + Number(actorData.data.attributes[rollType].value)

    console.log(data);

    return data;
  }

  /* -------------------------------------------- */

  _prepareCharacterItems(actorData, items) {
    actorData.workList = [];
    actorData.syndromeList = [];
    actorData.comboList = [];
    actorData.effectList = [];
    actorData.easyEffectList = [];
    actorData.roisList = [];
    actorData.memoryList = [];

    actorData.weaponList = [];
    actorData.protectList = [];
    actorData.vehicleList = [];
    actorData.connectionList = [];
    actorData.itemList = [];


    for (let i of items) {
      let item = i.data;

      if (i.type == 'works')
        actorData.workList.push(i);
      else if (i.type == 'syndrome')
        actorData.syndromeList.push(i);
      else if (i.type == 'combo')
        actorData.comboList.push(i);
      else if (i.type == 'effect') {
        if (i.data.type == 'normal')
          actorData.effectList.push(i);
        else
          actorData.easyEffectList.push(i);
      } else if (i.type == 'rois') {
        if (i.data.type == "M")
          actorData.memoryList.push(i);
        else
          actorData.roisList.push(i);
      }

      else if (i.type == 'weapon')
        actorData.weaponList.push(i);
      else if (i.type == 'protect')
        actorData.protectList.push(i);
      else if (i.type == 'vehicle')
        actorData.vehicleList.push(i);
      else if (i.type == 'connection')
        actorData.connectionList.push(i);
      else if (i.type == 'item')
        actorData.itemList.push(i);
    }

    actorData.syndromeType = "-"
    if (actorData.syndromeList.length == 1)
      actorData.syndromeType = game.i18n.localize("DX3rd.PureBreed");
    else if (actorData.syndromeList.length == 2)
      actorData.syndromeType = game.i18n.localize("DX3rd.CrossBreed");
    else if (actorData.syndromeList.length == 3)
      actorData.syndromeType = game.i18n.localize("DX3rd.TriBreed");

    actorData.applied = Object.values(actorData.data.attributes.applied).map( i => {
      let actor = game.actors.get(i.actorId);
      let item = actor.items.get(i.itemId);

      let data = item.data;
      data.actor = actor.data.name;
      data.disable = i.disable;
      return item.data;

    });

    actorData.applied = Object.values(actorData.data.attributes.applied).reduce( (acc, i) => {
      if (game.actors.get(i.actorId) == undefined)
        return acc;

      let actor = game.actors.get(i.actorId);
      if (actor.items.get(i.itemId) == undefined)
      if (!(i.itemId in actor.items))
        return acc;

      let item = actor.items.get(i.itemId);

      let data = item.data;
      data.actor = actor.data.name;
      data.disable = i.disable;

      acc.push(data);
      return acc;
    }, []);
    
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.ability-roll').hover(this._onUpdateDice.bind(this, 'ability'), this._onUpdateDice.bind(this, null));
    html.find('.skill-roll').hover(this._onUpdateDice.bind(this, 'skill'), this._onUpdateDice.bind(this, null));

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    html.find('.ability-roll').click(this._onRollAbility.bind(this));
    html.find('.skill-roll').click(this._onRollSkill.bind(this));

    html.find('.backtrack-roll').click(this.rollBackTrack.bind(this));


    html.find('.active-check').on('click', async ev => {
      event.preventDefault();
      const li = event.currentTarget.closest(".item");
      const item = this.actor.items.get(li.dataset.itemId);
      await item.update({'data.active.state': !item.data.data.active.state});
    });

    html.find('.active-equipment').on('click', async ev => {
      event.preventDefault();
      const li = event.currentTarget.closest(".item");
      const item = this.actor.items.get(li.dataset.itemId);
      await item.update({'data.equipment': !item.data.data.equipment});
    });

    html.find('.active-titus').on('click', async ev => {
      event.preventDefault();
      const li = event.currentTarget.closest(".item");
      const item = this.actor.items.get(li.dataset.itemId);
      await item.update({'data.titus': !item.data.data.titus});
    });

    html.find('.active-sublimation').on('click', async ev => {
      event.preventDefault();
      const li = event.currentTarget.closest(".item");
      const item = this.actor.items.get(li.dataset.itemId);
      await item.update({'data.sublimation': !item.data.data.sublimation});
    });

    html.find('.btn-titus').on('click', async ev => {
      event.preventDefault();
      const li = event.currentTarget.closest(".item");
      const item = this.actor.items.get(li.dataset.itemId);
      await item.setTitus();
    });

    html.find('.btn-sublimation').on('click', async ev => {
      event.preventDefault();
      const li = event.currentTarget.closest(".item");
      const item = this.actor.items.get(li.dataset.itemId);
      await item.setSublimation();
    });


    html.find('.skill-create').click(this._onSkillCreate.bind(this));
    html.find('.skill-edit').click(this._onShowSkillDialog.bind(this));

    // Owned Item management
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));

    // Talent
    html.find('.item-label').click(this._onShowItemDetails.bind(this));
    html.find(".echo-item").click(this._echoItemDescription.bind(this));

    html.find(".attributes").on("click", "a.attribute-control", this._onClickAttributeControl.bind(this));

    html.find(".show-applied").on('click', async ev => {
      const list = {attack: "DX3rd.Attack", dice: "DX3rd.Dice", add: "DX3rd.Add", critical: "DX3rd.Critical", critical_min: "DX3rd.CriticalMin", 
hp: "DX3rd.HP", init: "DX3rd.Init", armor: "DX3rd.Armor", guard: "DX3rd.Guard", saving: "DX3rd.Saving", 
major_dice: "DX3rd.MajorDice", major: "DX3rd.MajorAdd", major_critical: "DX3rd.MajorCritical", reaction_dice: "DX3rd.ReactionDice", reaction: "DX3rd.ReactionAdd", reaction_critical: "DX3rd.ReactionCritical", dodge_dice: "DX3rd.DodgeDice", dodge: "DX3rd.DodgeAdd", dodge_critical: "DX3rd.DodgeCritical", 
body_add: "DX3rd.BodyAdd", body_dice: "DX3rd.BodyDice", sense_add: "DX3rd.SenseAdd", sense_dice: "DX3rd.SenseDice", mind_add: "DX3rd.MindAdd", mind_dice: "DX3rd.MindDice", social_add: "DX3rd.SocialAdd", social_dice: "DX3rd.SocialDice"};

      const li = event.currentTarget.closest(".item");
      let attr = this.actor.data.data.attributes.applied[li.dataset.itemId].attributes;
      let content = `<table><tr><th>${game.i18n.localize("DX3rd.Attributes")}</th><th>${game.i18n.localize("DX3rd.Value")}</th></tr>`
      for (let [key, value] of Object.entries(attr)) {
        let str = "";
        str = game.i18n.localize(list[key]);
        content += `<tr><td>${str}</td><td>${value.value}</td></tr>`
      }
      content += `</table>`;

      new Dialog({
        title: game.i18n.localize("DX3rd.Applied"),
        content: content,
        buttons: {}
      }).render(true);
    });

    html.find(".remove-applied").on('click', async ev => {
      const li = event.currentTarget.closest(".item");
      await this.actor.update({[`data.attributes.applied.-=${li.dataset.itemId}`]: null});
    });
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options={}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height;
    sheetBody.css("height", bodyHeight - 300);
    return position;
  }

  /* -------------------------------------------- */

  async _onUpdateDice(type) {
    const wrapper = event.currentTarget.closest(".sheet-wrapper");
    let dice = $(wrapper).find("#dice");
    let critical = $(wrapper).find("#critical");
    let add = $(wrapper).find("#add");

    let diceOptions = {};

    if (type == 'ability') {
      const li = event.currentTarget.closest(".ability");
      const key = li.dataset.abilityId;
      const ability = this.actor.data.data.attributes[key];

      diceOptions.base = key;
      diceOptions.skill = null;
      diceOptions.rollType = this.actor.data.data.attributes.dice.view;

    } else if (type == 'skill') {
      const li = event.currentTarget.closest(".skill");
      const key = li.dataset.skillId;
      const skill = this.actor.data.data.attributes.skills[key];

      diceOptions.base = skill.base;
      diceOptions.skill = key;
      diceOptions.rollType = this.actor.data.data.attributes.dice.view;

    } else {
      let rollType = this.actor.data.data.attributes.dice.view;

      dice.val(this.actor.data.data.attributes.dice.value + Number(this.actor.data.data.attributes[rollType].dice) + Number(this.actor.data.data.attributes.encroachment.dice));
      critical.val(this.actor.data.data.attributes.critical.value + this.actor.data.data.attributes[rollType].critical);
      add.val(this.actor.data.data.attributes.add.value + Number(this.actor.data.data.attributes[rollType].value));
      return;
    }

    let ret = this.actor._getDiceData(diceOptions);
    dice.val(ret.dice);
    critical.val(ret.critical);
    add.val(ret.add);

  }

  /* -------------------------------------------- */

  async _onRollAbility(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".ability");
    const key = li.dataset.abilityId;
    const ability = this.actor.data.data.attributes[key];
    const title = game.i18n.localize("DX3rd." + key[0].toUpperCase() + key.slice(1));

    const diceOptions = {
      "base": key,
      "skill": null
    };

    let append = false;
    if (event.ctrlKey)
      append = true;
    
    Dialog.confirm({
      title: game.i18n.localize("DX3rd.Combo"),
      content: "",
      yes: async () => await new ComboDialog(this.actor, title, diceOptions, append).render(true),
      no: async () => await this.actor.rollDice(title, diceOptions, append),
      defaultYes: false
    });

  }

  /* -------------------------------------------- */

  async _onRollSkill(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".skill");
    const key = li.dataset.skillId;
    const skill = this.actor.data.data.attributes.skills[key];
    const title = (skill.name.indexOf('DX3rd.') != -1) ? game.i18n.localize(skill.name) : skill.name;

    const diceOptions = {
      "base": skill.base,
      "skill": key
    };

    let append = false;
    if (event.ctrlKey)
      append = true;
    
    Dialog.confirm({
      title: game.i18n.localize("DX3rd.Combo"),
      content: "",
      yes: async () => await new ComboDialog(this.actor, title, diceOptions, append).render(true),
      no: async () => await this.actor.rollDice(title, diceOptions, append),
      defaultYes: false
    });

  }

  /* -------------------------------------------- */

  _onSkillCreate(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.abilityId;
    
    new DX3rdSkillDialog(this.actor, null, {"title": game.i18n.localize("DX3rd.CreateSkill"), base: key}).render(true);
  }

  /* -------------------------------------------- */

  _onShowSkillDialog(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".skill");
    const key = li.dataset.skillId;

    new DX3rdSkillDialog(this.actor, key, {"title": game.i18n.localize("DX3rd.EditSkill")}).render(true);
  }

  /* -------------------------------------------- */
   
  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const data = duplicate(header.dataset);

    if (type == 'effect')
      data.type = data.effectType;
    else if (type == 'rois')
      data.type = data.roisType;

    const name = `New ${type.capitalize()}`;
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    //delete itemData.data["type"];
    await this.actor.createEmbeddedDocuments('Item', [itemData], {});
  }

  /* -------------------------------------------- */

  /**
   * Handle editing an existing Owned Item for the Actor
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    item.sheet.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an existing Owned Item for the Actor
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemDelete(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    let item = this.actor.items.get(li.dataset.itemId);
    item.delete();
  }

  /* -------------------------------------------- */

  _onShowItemDetails(event) {
    event.preventDefault();
    const toggler = $(event.currentTarget);
    const item = toggler.parents('.item');
    const description = item.find('.item-description');

    toggler.toggleClass('open');
    description.slideToggle();
  }

  /* -------------------------------------------- */

  _echoItemDescription(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    let item = this.actor.items.get(li.dataset.itemId);

    item.toMessage();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDropActor(event, data) {
    if ( !this.actor.isOwner ) return false;

    const actor = await Actor.implementation.fromDropData(data);
    const actorData = actor.toObject();

    console.log(actor);

    const name = ``;
    const itemData = {
      name: actor.name,
      img: actor.img,
      type: "rois",
      data: {
        "actor": actor.id
      }
    };

    console.log(itemData);

    // Handle item sorting within the same Actor
    if ( await this._isFromSameActor(data) ) return this._onSortItem(event, itemData);

    // Create the owned item
    return this._onDropItemCreate(itemData);
  }

  /* -------------------------------------------- */

  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const pos = a.dataset.pos;
    const form = this.form;

    let s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = Array(16).join().split(",").map(() => s.charAt(Math.floor(Math.random() * s.length)) ).join('');

    // Add new attribute
    if ( action === "create" ) {
      let attr = `data.attributes.record.${id}.key`;

      let newKey = document.createElement("div");
      const record = `<input type="hidden" name="${attr}" value="${id}"/>`;
      newKey.innerHTML = record;

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

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    formData = this.updateRecord(formData);

    // Update the Item
    return this.object.update(formData);
  }

  /* -------------------------------------------- */

  updateRecord(formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).data.attributes.record || {};

    console.log(formAttrs);

    const record = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    for ( let k of Object.keys(this.object.data.data.attributes.record) ) {
      if ( !record.hasOwnProperty(k) ) record[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes.record")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "data.attributes.record": record});

    return formData;
  }

  /* -------------------------------------------- */

  async rollBackTrack() {

    let rois = 0;
    for (let item of this.actor.items) {
      if (item.type == "rois" && item.data.data.type != "D" && item.data.data.type != "M" && !item.data.data.titus && !item.data.data.sublimation)
        rois += 1;
    }

    let extraBackTrackDialog = new Dialog({
      title: `${game.i18n.localize("DX3rd.BackTrack")} - ${game.i18n.localize("DX3rd.EXPExtra")}`,
      content: `
        <h2>${game.i18n.localize("DX3rd.BackTrack")} - ${game.i18n.localize("DX3rd.EXPExtra")} (${rois})</h2>
      `,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: "Apply",
          callback: async () => {
            let formula =`${rois}D10`;

            let roll = new Roll(formula);
            await roll.roll({async: true})

            let before = this.actor.data.data.attributes.encroachment.value;
            let after = (before - roll.total < 0) ? 0 : before - roll.total;

            await this.actor.update({"data.attributes.encroachment.value": after});

            let rollMode = game.settings.get("core", "rollMode");
            let rollData = await roll.render();
            let content = `
              <div class="dx3rd-roll">
                <h2 class="header"><div class="title width-100">
                  ${game.i18n.localize("DX3rd.BackTrack")} 
                  <div style="font-size: smaller; color: gray; float: right;">${game.i18n.localize("DX3rd.EXPExtra")}</div>
                </div></h2>
                <div class="context-box">
                  ${game.i18n.localize("DX3rd.Encroachment")}: ${before} -> ${after} (-${roll.total})
                </div>
                ${rollData}
            `;

            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({actor: this.actor}),
              content: content + `</div>`,
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              sound: CONFIG.sounds.dice,
              roll: roll,
            }, {rollMode});

          }
        }
      }
    });

    let backTrackDialog = new Dialog({
      title: `${game.i18n.localize("DX3rd.BackTrack")}`,
      content: `
        <h2>${game.i18n.localize("DX3rd.BackTrack")} (${rois})</h2>
      `,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: "X 1",
          callback: async () => {
            let formula =`${rois}D10`;

            let roll = new Roll(formula);
            await roll.roll({async: true})

            let before = this.actor.data.data.attributes.encroachment.value;
            let after = (before - roll.total < 0) ? 0 : before - roll.total;

            await this.actor.update({"data.attributes.encroachment.value": after});

            let rollMode = game.settings.get("core", "rollMode");
            let rollData = await roll.render();
            let content = `
              <div class="dx3rd-roll">
                <h2 class="header"><div class="title">${game.i18n.localize("DX3rd.BackTrack")}</div></h2>
                <div class="context-box">
                  ${game.i18n.localize("DX3rd.Encroachment")}: ${before} -> ${after} (-${roll.total})
                </div>
                ${rollData}
            `;

            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({actor: this.actor}),
              content: content + `</div>`,
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              sound: CONFIG.sounds.dice,
              roll: roll,
            }, {rollMode});

            if (this.actor.data.data.attributes.encroachment.value >= 100)
              extraBackTrackDialog.render(true);
          }
        },
        two: {
          icon: '<i class="fas fa-times"></i>',
          label: "X 2",
          callback: async () => {
            let formula =`${rois * 2}D10`;

            let roll = new Roll(formula);
            await roll.roll({async: true})

            let before = this.actor.data.data.attributes.encroachment.value;
            let after = (before - roll.total < 0) ? 0 : before - roll.total;

            await this.actor.update({"data.attributes.encroachment.value": after});

            let rollMode = game.settings.get("core", "rollMode");
            let rollData = await roll.render();
            let content = `
              <div class="dx3rd-roll">
                <h2 class="header"><div class="title width-100">
                  ${game.i18n.localize("DX3rd.BackTrack")} 
                  <div style="font-size: smaller; color: gray; float: right;">${game.i18n.localize("DX3rd.EXPx2")}</div>
                </div></h2>
                <div class="context-box">
                  ${game.i18n.localize("DX3rd.Encroachment")}: ${before} -> ${after} (-${roll.total})
                </div>
                ${rollData}
            `;

            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({actor: this.actor}),
              content: content + `</div>`,
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              sound: CONFIG.sounds.dice,
              roll: roll,
            }, {rollMode});

            if (this.actor.data.data.attributes.encroachment.value >= 100)
              extraBackTrackDialog.render(true);
          }
        }
      },
      default: "one"
    });


    let eRoisDialog = new Dialog({
      title: game.i18n.localize("DX3rd.Exhaust") + ' ' + game.i18n.localize("DX3rd.BackTrack"),
      content: `
        <h2>${game.i18n.localize("DX3rd.Exhaust")} ${game.i18n.localize("DX3rd.BackTrack")}</h2>
        <input type="number" id="rois" placeholder="0">
      `,
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: "Apply",
          callback: async () => {
            let eRois = $("#rois").val();
            if (eRois != "" && eRois != 0) {
              let formula =`${eRois}D10`;

              let roll = new Roll(formula);
              await roll.roll({async: true})

              let before = this.actor.data.data.attributes.encroachment.value;
              let after = (before - roll.total < 0) ? 0 : before - roll.total;

              await this.actor.update({"data.attributes.encroachment.value": after});

              let rollMode = game.settings.get("core", "rollMode");
              let rollData = await roll.render();
              let content = `
                <div class="dx3rd-roll">
                  <h2 class="header">
                    <div class="title">${game.i18n.localize("DX3rd.Exhaust")} ${game.i18n.localize("DX3rd.BackTrack")}</div></h2>
                  <div class="context-box">
                    ${game.i18n.localize("DX3rd.Encroachment")}: ${before} -> ${after} (-${roll.total})
                  </div>
                  ${rollData}
              `;

              ChatMessage.create({
                speaker: ChatMessage.getSpeaker({actor: this.actor}),
                content: content + `</div>`,
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                sound: CONFIG.sounds.dice,
                roll: roll,
              }, {rollMode});
            }

          }
        }
      },
      close: () => backTrackDialog.render(true)
    });

    eRoisDialog.render(true);

  }

  /* -------------------------------------------- */

}