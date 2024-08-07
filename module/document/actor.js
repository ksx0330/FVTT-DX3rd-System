
export class DX3rdActor extends Actor {
  
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    this.prototypeToken.updateSource({ actorLink: true });
  }

  prepareData() {
    super.prepareData();

    this._prepareActorEnc();
    this._prepareItemEnc();

    this._prepareActorItem();
    this._prepareActorSkills();

    this._prepareCombo();
  }

  _prepareActorItem() {
    let attributes = this.system.attributes;

    let values = {
      "enc_init": { "value" : attributes.encroachment.init.input },
      "body": { "value": attributes.body.point },
      "sense": { "value": attributes.sense.point },
      "mind": { "value": attributes.mind.point },
      "social": { "value": attributes.social.point },
      
      "attack": { "value": 0 },
      "dice": { "value": 0 },
      "add": { "value": 0 },
      "critical": { "value": 10 },

      "hp": { "value": 0 },
      "init": { "value": 0 },
      "armor": { "value": 0 },
      "guard": { "value": 0 },
      "saving": { "value": 0 },
      "exp": { "value": 0 },

      "battleMove": { "value": 0 },

      "major": { "value": 0 },
      "major_dice": { "value": 0 },
      "major_critical": { "value": 0 },

      "reaction": { "value": 0 },
      "reaction_dice": { "value": 0 },
      "reaction_critical": { "value": 0 },

      "dodge": { "value": 0 },
      "dodge_dice": { "value": 0 },
      "dodge_critical": { "value": 0 },

      "body_value": { "value": 0 },
      "sense_value": { "value": 0 },
      "mind_value": { "value": 0 },
      "social_value": { "value": 0 },
      "body_add": { "value": 0 },
      "sense_add": { "value": 0 },
      "mind_add": { "value": 0 },
      "social_add": { "value": 0 },
      "body_dice": { "value": 0 },
      "sense_dice": { "value": 0 },
      "mind_dice": { "value": 0 },
      "social_dice": { "value": 0 }
    }

    let skills = attributes.skills
    for (const [key, value] of Object.entries(skills)) {
      skills[key].value = parseInt(skills[key].point);
      skills[key].dice = 0;
    }

    let works = null;
    let syndrome = [];
    let effect = [];
    let combo = [];
    let record = [];
    
    let itemType = ["weapon", "protect", "vehicle", "connection", "item"];
    let item = [];

    for (let i of this.items) {
      if (i.type == 'works')
        works = i;
      else if (i.type == 'syndrome' && attributes.syndrome[i.id])
        syndrome.push(i);
      else if (i.type == 'effect' && i.system.active.state)
        effect.push(i);
      else if (i.type == 'combo' && i.system.active.state)
        combo.push(i);
      else if (itemType.includes(i.type) && i.system.equipment)
        item.push(i);
      else if (i.type == 'record')
        record.push(i);
    }

    if (works != null) {
      values = this._updateData(values, works.system.attributes);
      this._updateSkillData(works.system.skills);
    }

    for (let s of syndrome) {
      values = this._updateData(values, s.system.attributes);
      if (syndrome.length == 1)
        values = this._updateData(values, s.system.attributes);
    }

    values["exp"].value = this._calExp(values);

    let fullMove = 0;
    let weaponAdd = { "melee": 0, "ranged": 0 };
    let tmp = {
      "dodge": { "value": 0 },
      "armor": { "value": 0 },
      "init": { "value": 0 }
    };

    for (let i of item) {
      let iData = i.system;

      for (let [key, value] of Object.entries(tmp))
        if (key in iData)
          tmp[key].value += iData[key];

      if (i.type == "weapon" && iData.type != "-")
        weaponAdd[iData.type] += iData.add;
      if (i.type == "vehicle" && iData.move != "")
        fullMove = iData.move;

      values["saving"].value += iData.saving.value;
      values["exp"].value += iData.exp;
      this._updateSkillData(iData.skills);
    }
    values = this._updateData(values, tmp);
    attributes.add.melee = weaponAdd.melee;
    attributes.add.ranged = weaponAdd.ranged;

    attributes.exp.append = record.reduce((acc, i) => acc + i.system.exp, 0);
    attributes.exp.total = Number(attributes.exp.init) + Number(attributes.exp.append);
    this.system.attributes.exp.now = this.system.attributes.exp.total - values["exp"].value;
    delete values["exp"];

    attributes.critical.min = 10;
    for (let e of effect) {
      values = this._updateEffectData(values, e.system.attributes, e.system.level.value);
      if ("critical_min" in e.system.attributes && e.system.attributes.critical_min.value < attributes.critical.min)
        attributes.critical.min = Number(e.system.attributes.critical_min.value);
    }
    for (let e of combo) {
      values = this._updateEffectData(values, e.system.attributes, 0);
      if ("critical_min" in e.system.attributes && e.system.attributes.critical_min.value < attributes.critical.min)
        attributes.critical.min = Number(e.system.attributes.critical_min.value);
    }

    for (let e of Object.values(this.system.attributes.applied)) {
      values = this._updateEffectData(values, e.attributes, 0);
      if ("critical_min" in e.attributes && e.attributes.critical_min.value < attributes.critical.min)
        attributes.critical.min = Number(e.attributes.critical_min.value);
    }

    if (values.critical.value < attributes.critical.min)
      values.critical.value = Number(attributes.critical.min);

    let rollStat = ["major", "reaction", "dodge"];

    values["dodge_critical"].value += values["reaction_critical"].value;
    for (let l of rollStat) {
      attributes[l].critical = values[l + "_critical"].value;
      attributes[l].dice = values[l + "_dice"].value;
      delete values[l + "_critical"];
      delete values[l + "_dice"];
    }

    let mainStat = ["body", "sense", "mind", "social"];
    for (let l of mainStat) {
      values[l].value += values[l + "_value"].value;
      attributes[l].add = values[l + "_add"].value;
      delete values[l + "_value"];
      delete values[l + "_add"];
    }

    attributes.saving.max = values['social'].value * 2 + skills['procure'].value * 2;
    attributes.saving.remain = attributes.saving.max - values["saving"].value;

    attributes.hp.max = values['hp'].value;
    attributes.hp.max += values['body'].value * 2 + values['mind'].value + 20;
    delete values.hp;

    values["init"].value += values['sense'].value * 2 + values['mind'].value;
    values["init"].value = (values["init"].value < 0) ? 0 : values["init"].value;
    attributes.move.battle = values["init"].value + 5 + values["battleMove"].value;
    attributes.move.full = (fullMove == 0) ? attributes.move.battle * 2 : fullMove;

    delete values["battleMove"];

    for (let l of mainStat) {
      values[l].value += values[l + "_dice"].value;
      delete values[l + "_dice"];
    }

    attributes.encroachment.init.value = values["enc_init"].value;
    delete values["enc_init"];

    for (const [key, value] of Object.entries(values))
      attributes[key].value = value.value;
  }

  _updateSkillData(attributes) {
    let data = this.system.attributes.skills;

    for (const [key, value] of Object.entries(attributes)) {
      if (value.apply && key in data) {
        data[key].value += value.add;

        if ("dice" in value)
          data[key].dice += value.dice;
      }
    }
  }

  _updateEffectData(values, attributes, level) {
    for (const [key, value] of Object.entries(attributes)) {
      if (!(key in values))
        continue;

      let val = 0;
      try {
        if (value.value != "") {
          let num = value.value.replace("@level", level);
          val = math.evaluate(num);
        }
        
      } catch (error) {
        console.error("Values other than formula, @level are not allowed.");
      }

      values[key].value += val;
    }

    return values;
  }

  _updateData(values, attributes) {
    for (const [key, value] of Object.entries(attributes))
      if (key != '-')
        values[key].value += value.value;

    return values;
  }

  _calExp(values) {
    let exp = values["exp"].value;
    let list = ["body", "sense", "mind", "social"];

    for (let l of list) {
      let total = values[l].value;
      let point = this.system.attributes[l].point;

      if (total < 12)
        exp += point * 10;
      else if (total < 22)
        exp += 110 - (total - point) * 10 + (total - 11) * 20;
      else
        exp += 310 - (total - point) * 10 + (total - 21) * 30;
    }

    let skills = this.system.attributes.skills
    for (const [key, value] of Object.entries(skills)) {
      let total = value.value;
      let point = value.point;
      let d = (value.delete) ? 1 : 2;

      if (total < 7)
        exp += point * d;
      else if (total < 12)
        exp += 6 * d - (total - point) * d + (total - 6) * 3;
      else if (total < 22)
        exp += 15 + 6 * d - (total - point) * d + (total - 11) * 5;
      else
        exp += 65 + 6 * d - (total - point) * d + (total - 21) * 10;
    }

    for (let i of this.items) {
      if (i.type == 'effect') {
        let level = i.system.level.init;
        let own = i.system.exp.own;
        let upgrade = i.system.exp.upgrade;

        if (own)
          exp += (i.system.type != "easy") ? 15 : 2;
        if (upgrade)
          exp += (i.system.type != "easy") ? (level - 1) * 5 : (level - 1) * 2;
      }
    }

    return exp;
  }

  _prepareActorSkills() {
    let skills = {
      "body": {},
      "sense": {},
      "mind": {},
      "social": {}
    }

    let data = this.system.attributes.skills;
    for (let [key, value] of Object.entries(data)) {
      if (value.base === "body")
        skills.body[key] = value;
      else if (value.base === "sense")
        skills.sense[key] = value;
      else if (value.base === "mind")
        skills.mind[key] = value;
      else if (value.base === "social")
        skills.social[key] = value;

    }

    this.system.skills = skills;
  }

  _prepareActorEnc() {
    let enc = this.system.attributes.encroachment;
    let encType = enc.type;
    enc.dice = 0;
    enc.level = 0;

    let encList = {
      "-": {
        dice: [60, 80, 100, 130, 160, 200, 240, 300],
        level: [100, 160]
      },
      "ea": {
        dice: [60, 80, 100, 130, 190, 260, 300],
        level: [100, 160, 220]
      },
      "origin": {
        dice: [],
        level: [80, 100, 150]
      }
    }

    for (let [type, list] of [["dice",  encList[encType].dice], ["level", encList[encType].level]]) {
      for (let l of list) {
        if (enc.value < l)
          break;
        enc[type] += 1;
      }
    }

  }

  _prepareItemEnc() {
    for (let i of this.items) {
      if (i.type == 'effect') {
        i.system.level.value = i.system.level.init;
        if (!i.system.level.upgrade)
          continue;
        
        i.system.level.value += this.system.attributes.encroachment.level;
      }
    }

  }


  _prepareCombo() {

    let combos = [];
    for (let i of this.items) {
      if (i.type == 'combo')
        combos.push(i);
    }

    let attributes = this.system.attributes;
    let valuesOriginal = {
      "attack": { "value": 0 },
      "add": { "value": 0 },
      "dice": { "value": 0 },
      "critical": { "value": 0 },

      "major": { "value": 0 },
      "major_dice": { "value": 0 },
      "major_critical": { "value": 0 },

      "reaction": { "value": 0 },
      "reaction_dice": { "value": 0 },
      "reaction_critical": { "value": 0 },

      "dodge": { "value": 0 },
      "dodge_dice": { "value": 0 },
      "dodge_critical": { "value": 0 },


      "body_add": { "value": 0 },
      "sense_add": { "value": 0 },
      "mind_add": { "value": 0 },
      "social_add": { "value": 0 },
      "body_dice": { "value": 0 },
      "sense_dice": { "value": 0 },
      "mind_dice": { "value": 0 },
      "social_dice": { "value": 0 }
    }

    for (let c of combos) {
      let values = duplicate(valuesOriginal);
      let critical_min = attributes.critical.min;

      let comboData = c.system;
      let encroachStr = [];
      comboData.encroach.value = 0;

      let effectList = comboData.effect;
      let effectItems = comboData.effectItems = {};
      let weaponList = comboData.weapon;
      let weaponItems = comboData.weaponItems = {};

      for (let effectId of effectList) {
        if (this.items.get(effectId) == undefined)
          continue;

        let effect = this.items.get(effectId);
        effectItems[effectId] = effect;

        if ( Number.isNaN(Number(effect.system.encroach.value)) )
          encroachStr.push(effect.system.encroach.value);
        else
          comboData.encroach.value += Number(effect.system.encroach.value);

        if (effect.system.active.state)
          continue;

        values = this._updateEffectData(values, effect.system.attributes, effect.system.level.value);
        if ("critical_min" in effect.system.attributes && effect.system.attributes.critical_min.value < critical_min)
          critical_min = Number(effect.system.attributes.critical_min.value);
      }

      if (encroachStr.length > 0)
        comboData.encroach.value += "+" + encroachStr.join("+");

      values = this._updateEffectData(values, comboData.attributes, 0);
      if ("critical_min" in comboData.attributes && comboData.attributes.critical_min.value < critical_min)
        critical_min = Number(comboData.attributes.critical_min.value);


      for (let weaponId of weaponList) {
        if (this.items.get(weaponId) == undefined)
          continue;

        let weapon = this.items.get(weaponId);
        weaponItems[weaponId] = weapon;
        values.attack.value += weapon.system.attack;
      }

      comboData.major.value = Number(attributes.major.value) + values.major.value;
      comboData.major.dice = Number(attributes.major.dice) + values.major_dice.value;
      comboData.major.critical = Number(attributes.critical.value) + values.critical.value + Number(attributes.major.critical) + values.major_critical.value;
      if (comboData.major.critical < critical_min)
        comboData.major.critical = critical_min;

      comboData.reaction.value = Number(attributes.reaction.value) + values.reaction.value;
      comboData.reaction.dice = Number(attributes.reaction.dice) + values.reaction_dice.value;
      comboData.reaction.critical = Number(attributes.critical.value) + values.critical.value + Number(attributes.reaction.critical) + values.reaction_critical.value;
      if (comboData.reaction.critical < critical_min)
        comboData.reaction.critical = critical_min;

      comboData.dodge.value = comboData.reaction.value + Number(attributes.dodge.value) + values.dodge.value;
      comboData.dodge.dice = comboData.reaction.dice + Number(attributes.dodge.dice) + values.dodge_dice.value;
      comboData.dodge.critical = Number(attributes.critical.value) + values.critical.value + Number(attributes.dodge.critical) + values.dodge_critical.value + values.reaction_critical.value;
      if (comboData.dodge.critical < critical_min)
        comboData.dodge.critical = critical_min;


      comboData.attack.value = Number(attributes.attack.value) + values.attack.value;
      comboData.add.value = Number(attributes.add.value) + values.add.value;
      comboData.dice.value = Number(attributes.dice.value) + values.dice.value;
      comboData.critical.value = Number(attributes.critical.value) + values.critical.value;
      comboData.critical.min = critical_min;
      if (comboData.critical.value < critical_min)
        comboData.critical.value = critical_min;


      if (comboData.roll != "-") {
        comboData.dice.value += comboData[comboData.roll].dice + Number(this.system.attributes.encroachment.dice) + Number(this.system.attributes.sublimation.dice);
        comboData.add.value += comboData[comboData.roll].value;
        comboData.critical.value = comboData[comboData.roll].critical + Number(this.system.attributes.sublimation.critical);
      }

      if (comboData.skill != "-" && comboData.skill in attributes.skills) {
        let skill = attributes.skills[comboData.skill];

        comboData.dice.value += skill.dice;
        comboData.add.value += skill.value;
      }

      if (comboData.base != "-") {
        let base = attributes[comboData.base];

        comboData.dice.value += base.value + values[comboData.base + "_dice"].value;
        comboData.add.value += base.add + values[comboData.base + "_add"].value;
      }

      if (game.ready && c.sheet.rendered)
        c.render(true);
    }

  }


  /* -------------------------------------------- */

  /** @override */
  _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
    super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);

    for (let doc of documents) {
      if (doc.type == "effect" || doc.type == "combo" || doc.type == "rois" || doc.type == "syndrome" || doc.type == "record")
        continue;

      this._addSkill(doc.system.skills);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId) {
    super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);

    for (let doc of documents) {
      if (doc.type == "effect" || doc.type == "combo" || doc.type == "rois" || doc.type == "syndrome" || doc.type == "record")
        continue;

      this._addSkill(doc.system.skills);
    }
  }

  /* -------------------------------------------- */
  
  async _addSkill(skill) {
    let data = this.system.attributes.skills;
    for (const [key, value] of Object.entries(skill)) {
      if (key in data || !value.apply || key == "" || value.base == "-")
        continue;

      let skill = {
        "name": value.name,
        "point": 0,
        "base": value.base,
        "delete": true
      }

      await this.update({[`data.attributes.skills.${key}`]: skill});
    }
  }

  async rollDice(title, diceOptions, append) {
    let content = "";
    let updateOptions = () => {};
    if (append) {
      content = `
        <table style="text-align: center;">
          <tr>
            <th>${game.i18n.localize("DX3rd.Dice")}</th>
            <th>${game.i18n.localize("DX3rd.Critical")}</th>
            <th>${game.i18n.localize("DX3rd.Add")}</th>
          </tr>
          <tr>
            <td><input type='text' id='roll-append-dice'></td>
            <td><input type='text' id='roll-append-critical'></td>
            <td><input type='text' id='roll-append-add'></td>
          </tr>
        </table><script>$("#dice").focus()</script>
        `;
      updateOptions = () => {
        diceOptions.appendDice = $("#roll-append-dice").val();
        diceOptions.appendCritical = $("#roll-append-critical").val();
        diceOptions.appendAdd = $("#roll-append-add").val();
      }
    }

    let buttons = {
        major: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DX3rd.Major"),
          callback: () => {
            if (append)
              updateOptions();
            diceOptions["rollType"] = "major";
            this._onRollDice(title, diceOptions);
          }
        },
        reaction: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DX3rd.Reaction"),
          callback: () => {
            if (append)
              updateOptions();
            diceOptions["rollType"] = "reaction";
            this._onRollDice(title, diceOptions);
          }
        },
        dodge: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DX3rd.Dodge"),
          callback: () => {
            if (append)
              updateOptions();
            diceOptions["rollType"] = "dodge";
            this._onRollDice(title, diceOptions);
          }
        }
    }

    if ("rollType" in diceOptions) {
      buttons = {
        "major": {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DX3rd.Roll"),
          callback: () => {
            if (append)
              updateOptions();
            this._onRollDice(title, diceOptions);
          }
        }
      }
    }


    new Dialog({
        title: game.i18n.localize("DX3rd.RollType"),
        content: content,
        buttons: buttons,
        default: "major"
    }).render(true);
    
  }

  _getDiceData(diceOptions) {
    let attributes = this.system.attributes;
    let base = this.system.attributes[diceOptions.base];
    let skill = this.system.attributes.skills[diceOptions.skill];

    let dice = base.value;
    let add = base.add;
    if (diceOptions.skill != null && diceOptions.skill != "-") {
      dice += skill.dice;
      add += skill.value;
    }

    dice += Number(attributes.dice.value) + Number(attributes.encroachment.dice) + Number(attributes.sublimation.dice);
    add += Number(attributes.add.value);
    let critical = attributes.critical.value;

    let rollType = diceOptions.rollType;
    dice += Number(attributes[rollType].dice);
    add += Number(attributes[rollType].value);
    critical += attributes[rollType].critical;

    if (critical < attributes.critical.min)
      critical = Number(attributes.critical.min);
    critical += Number(attributes.sublimation.critical);

    if (rollType == "dodge") {
      dice += Number(attributes["reaction"].dice);
      add += Number(attributes["reaction"].value);
    }

    return { dice, add, critical };
  }

  async _onRollDice(title, diceOptions) {
    let attributes = this.system.attributes;
    let rollType = diceOptions.rollType;
    let {dice, add, critical} = this._getDiceData(diceOptions);

    if ("attack" in diceOptions) {
      add += Number(attributes.add[diceOptions.attack.type]);
    }

    if ("appendDice" in diceOptions && diceOptions.appendDice != "") {
      let append = (diceOptions.appendDice < 0) ? diceOptions.appendDice : "+" + diceOptions.appendDice;
      dice = `(${dice}${append})`;
    }

    if ("appendCritical" in diceOptions && diceOptions.appendCritical != "") {
      let append = (diceOptions.appendCritical < 0) ? diceOptions.appendCritical : "+" + diceOptions.appendCritical;
      critical = `(${critical}${append})`;
    }

    if ("appendAdd" in diceOptions && diceOptions.appendAdd != "") {
      let append = (diceOptions.appendAdd < 0) ? diceOptions.appendAdd : "+" + diceOptions.appendAdd;
      add = `(${add}${append})`;
    }

    let formula = `${dice}dx${critical} + ${add}`;
    let roll = new Roll(formula);
    await roll.roll({async: true})

    let text = ("content" in diceOptions) ? diceOptions.content : "";
    let rollMode = game.settings.get("core", "rollMode");
    let rollData = await roll.render();
    let content = `
      <div class="dx3rd-roll" data-actor-id=${this.id}>
        <h2 class="header"><div class="title">${title}</div></h2>
        ${rollData}
        <div class="btn-box">${text}</div>
        
    `;

    if ("attack" in diceOptions) {
      let attack = Number(attributes.attack.value) + diceOptions.attack.value;
      content += `<button class="chat-btn calc-damage" data-attack="${attack}">${game.i18n.localize("DX3rd.DamageRoll")}</button>`;
    }

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: this}),
      content: content + `</div>`,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice,
      roll: roll,
    }, {rollMode});

    if ("key" in diceOptions) {
        await Hooks.call("updateActorEncroach", this, diceOptions.key, "roll");
    }

    if (rollType == "major") 
      Hooks.call("afterMajor", this);
    else if (rollType == "reaction" || rollType == "dodge") 
      Hooks.call("afterReaction", this);

    await this.update({ "system.attributes.sublimation.dice": 0, "system.attributes.sublimation.critical": 0 });
  }


  /** @override */
  async modifyTokenAttribute(attribute, value, isDelta=false, isBar=true) {
    const current = foundry.utils.getProperty(this.system, attribute);

    // Determine the updates to make to the actor data
    let updates;
    if ( isBar ) {
      if (isDelta) value = Number(current.value) + value;
      updates = {[`data.${attribute}.value`]: value};
    } else {
      if ( isDelta ) value = Number(current) + value;
      updates = {[`data.${attribute}`]: value};
    }

    const allowed = Hooks.call("modifyTokenAttribute", {attribute, value, isDelta, isBar}, updates);
    return allowed !== false ? this.update(updates) : this;
  }

  

}