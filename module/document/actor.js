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
      enc_init: { value: attributes.encroachment.init.input },
      body: { value: attributes.body.point },
      sense: { value: attributes.sense.point },
      mind: { value: attributes.mind.point },
      social: { value: attributes.social.point },

      attack: { value: 0 },
      dice: { value: 0 },
      add: { value: 0 },
      critical: { value: 10 },

      hp: { value: 0 },
      init: { value: 0 },
      armor: { value: 0 },
      guard: { value: 0 },
      saving: { value: 0 },
      exp: { value: 0 },

      battleMove: { value: 0 },
      fullMove: { value: 0 },

      major: { value: 0 },
      major_dice: { value: 0 },
      major_critical: { value: 0 },

      reaction: { value: 0 },
      reaction_dice: { value: 0 },
      reaction_critical: { value: 0 },

      dodge: { value: 0 },
      dodge_dice: { value: 0 },
      dodge_critical: { value: 0 },

      body_value: { value: 0 },
      sense_value: { value: 0 },
      mind_value: { value: 0 },
      social_value: { value: 0 },
      body_add: { value: 0 },
      sense_add: { value: 0 },
      mind_add: { value: 0 },
      social_add: { value: 0 },
      body_dice: { value: 0 },
      sense_dice: { value: 0 },
      mind_dice: { value: 0 },
      social_dice: { value: 0 },

      // 추가된 values
      casting_dice: { value: 0 },
      casting_add: { value: 0 },
      //
    };
    // 추가된 attributes
    attributes.casting_dice = values.casting_dice;
    attributes.casting_add = values.casting_add;
    //

    let skills = attributes.skills;
    for (const [key, value] of Object.entries(skills)) {
      skills[key].value = parseInt(skills[key].point);
      skills[key].dice = 0;
    }

    let works = null;
    let syndrome = [];
    let effect = [];
    let combo = [];
    let spell = [];
    let record = [];

    let itemType = ["weapon", "protect", "vehicle", "connection", "item"];
    let item = [];

    for (let i of this.items) {
      if (i.type == "works") works = i;
      else if (i.type == "syndrome" && attributes.syndrome[i.id])
        syndrome.push(i);
      else if (i.type == "effect" && i.system.active.state) effect.push(i);
      else if (i.type == "combo" && i.system.active.state) combo.push(i);
      else if (i.type == "spell") spell.push(i);
      else if (itemType.includes(i.type) && i.system.equipment) item.push(i);
      else if (i.type == "record") record.push(i);
    }

    if (works != null) {
      values = this._updateData(values, works.system.attributes);
      this._updateSkillData(skills, works.system.skills);
    }

    for (let s of syndrome) {
      values = this._updateData(values, s.system.attributes);
      if (syndrome.length == 1)
        values = this._updateData(values, s.system.attributes);
    }

    values["exp"].value = this._calExp(values);

    let fullMove = 0;
    let weaponAdd = { melee: 0, ranged: 0 };
    let tmp = {
      dodge: { value: 0 },
      armor: { value: 0 },
      init: { value: 0 },
    };

    for (let s of spell) {
      let sData = s.system;
      for (let [key, value] of Object.entries(tmp))
        if (key in sData) tmp[key].value += sData[key];
      values["exp"].value += sData.exp;
    }

    for (let i of item) {
      let iData = i.system;

      for (let [key, value] of Object.entries(tmp))
        if (key in iData) tmp[key].value += iData[key];

      if (i.type == "weapon" && iData.type != "-")
        weaponAdd[iData.type] += iData.add;
      if (i.type == "vehicle" && iData.move != "") fullMove = iData.move;

      if (i.type == "item") {
        values["saving"].value += iData.saving.value * iData.quantity.max;
        values["exp"].value += iData.exp * iData.quantity.max;
      } else {
        values["saving"].value += iData.saving.value;
        values["exp"].value += iData.exp;
      }
      this._updateSkillData(skills, iData.skills);
    }
    values = this._updateData(values, tmp);
    attributes.add.melee = weaponAdd.melee;
    attributes.add.ranged = weaponAdd.ranged;

    attributes.exp.append = record.reduce((acc, i) => acc + i.system.exp, 0);
    attributes.exp.total =
      Number(attributes.exp.init) + Number(attributes.exp.append);
    this.system.attributes.exp.now =
      this.system.attributes.exp.total - values["exp"].value;
    delete values["exp"];

    attributes.critical.min = 10;
    for (let e of effect) {
      values = this._updateEffectData(
        values,
        e.system.attributes,
        e.system.level.value
      );
      if (
        "critical_min" in e.system.attributes &&
        e.system.attributes.critical_min.value < attributes.critical.min
      )
        attributes.critical.min = Number(
          e.system.attributes.critical_min.value
        );
      this._updateSkillData(skills, e.system.skills);
    }
    for (let e of combo) {
      values = this._updateEffectData(values, e.system.attributes, 0);
      if (
        "critical_min" in e.system.attributes &&
        e.system.attributes.critical_min.value < attributes.critical.min
      )
        attributes.critical.min = Number(
          e.system.attributes.critical_min.value
        );
      this._updateSkillData(skills, e.system.skills);
    }

    for (let e of Object.values(this.system.attributes.applied)) {
      values = this._updateEffectData(values, e.attributes, 0);
      if (
        "critical_min" in e.attributes &&
        e.attributes.critical_min.value < attributes.critical.min
      )
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

    attributes.saving.max =
      values["social"].value * 2 + skills["procure"].value * 2;
    attributes.saving.remain = attributes.saving.max - values["saving"].value;

    attributes.hp.max = values["hp"].value;
    attributes.hp.max += values["body"].value * 2 + values["mind"].value + 20;
    delete values.hp;

    values["init"].value += values["sense"].value * 2 + values["mind"].value;
    values["init"].value = values["init"].value < 0 ? 0 : values["init"].value;

    attributes.move.battle =
      values["init"].value + 5 + values["battleMove"].value >
      Math.floor(fullMove / 5)
        ? values["init"].value + 5 + values["battleMove"].value
        : Math.floor(fullMove / 5);
    if (attributes.move.battle < 0) {
      attributes.move.battle = 0;
    }

    attributes.move.full =
      (fullMove == 0
        ? (values["init"].value + 5) * 2 + values["battleMove"].value * 2
        : fullMove) + values["fullMove"].value;
    if (attributes.move.full < 0) {
      attributes.move.full = 0;
    }

    delete values["battleMove"];
    delete values["fullMove"];

    for (let l of mainStat) {
      values[l].value += values[l + "_dice"].value;
      delete values[l + "_dice"];
    }

    attributes.encroachment.init.value = values["enc_init"].value;
    delete values["enc_init"];

    for (const [key, value] of Object.entries(values))
      attributes[key].value = value.value;
  }

  _updateSkillData(data, attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value.apply && key in data) {
        data[key].value += value.add;

        if ("dice" in value) data[key].dice += value.dice;
      }
    }
  }

  _updateEffectData(values, attributes, level) {
    for (const [key, value] of Object.entries(attributes)) {
      if (!(key in values)) continue;

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
      if (key != "-") values[key].value += value.value;

    return values;
  }

  _calExp(values) {
    let exp = values["exp"].value;
    let list = ["body", "sense", "mind", "social"];

    for (let l of list) {
      let total = values[l].value;
      let point = this.system.attributes[l].point;

      if (total < 12) exp += point * 10;
      else if (total < 22)
        exp += 110 - (total - point) * 10 + (total - 11) * 20;
      else exp += 310 - (total - point) * 10 + (total - 21) * 30;
    }

    let skills = this.system.attributes.skills;
    for (const [key, value] of Object.entries(skills)) {
      let total = value.value;
      let point = value.point;
      let d = value.delete ? 1 : 2;

      if (total < 7) exp += point * d;
      else if (total < 12) exp += 6 * d - (total - point) * d + (total - 6) * 3;
      else if (total < 22)
        exp += 15 + 6 * d - (total - point) * d + (total - 11) * 5;
      else exp += 65 + 6 * d - (total - point) * d + (total - 21) * 10;
    }

    for (let i of this.items) {
      if (i.type == "effect") {
        let level = i.system.level.init;
        let own = i.system.exp.own;
        let upgrade = i.system.exp.upgrade;

        if (own) exp += i.system.type != "easy" ? 15 : 2;
        if (upgrade)
          exp += i.system.type != "easy" ? (level - 1) * 5 : (level - 1) * 2;
      }
    }

    return exp;
  }

  _prepareActorSkills() {
    let skills = {
      body: {},
      sense: {},
      mind: {},
      social: {},
    };

    let data = this.system.attributes.skills;
    for (let [key, value] of Object.entries(data)) {
      if (value.base === "body") skills.body[key] = value;
      else if (value.base === "sense") skills.sense[key] = value;
      else if (value.base === "mind") skills.mind[key] = value;
      else if (value.base === "social") skills.social[key] = value;
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
        level: [100, 160],
      },
      ea: {
        dice: [60, 80, 100, 130, 190, 260, 300],
        level: [100, 160, 220],
      },
      origin: {
        dice: [],
        level: [80, 100, 150],
      },
    };

    for (let [type, list] of [
      ["dice", encList[encType].dice],
      ["level", encList[encType].level],
    ]) {
      for (let l of list) {
        if (enc.value < l) break;
        enc[type] += 1;
      }
    }
  }

  _prepareItemEnc() {
    for (let i of this.items) {
      if (i.type == "effect") {
        i.system.level.value = i.system.level.init;
        if (!i.system.level.upgrade) continue;

        i.system.level.value += this.system.attributes.encroachment.level;
      }
    }
  }

  _prepareCombo() {
    let combos = [];
    for (let i of this.items) {
      if (i.type == "combo") combos.push(i);
    }

    let attributes = this.system.attributes;
    let valuesOriginal = {
      attack: { value: 0 },
      add: { value: 0 },
      dice: { value: 0 },
      critical: { value: 0 },

      major: { value: 0 },
      major_dice: { value: 0 },
      major_critical: { value: 0 },

      reaction: { value: 0 },
      reaction_dice: { value: 0 },
      reaction_critical: { value: 0 },

      dodge: { value: 0 },
      dodge_dice: { value: 0 },
      dodge_critical: { value: 0 },

      body_add: { value: 0 },
      sense_add: { value: 0 },
      mind_add: { value: 0 },
      social_add: { value: 0 },
      body_dice: { value: 0 },
      sense_dice: { value: 0 },
      mind_dice: { value: 0 },
      social_dice: { value: 0 },
    };
    let skillsOriginal = attributes.skills;

    for (let c of combos) {
      let values = duplicate(valuesOriginal);
      let skills = duplicate(skillsOriginal);
      let critical_min = attributes.critical.min;

      let comboData = c.system;
      let encroachStr = [];
      comboData.encroach.value = 0;

      let effectList = comboData.effect;
      let effectItems = (comboData.effectItems = {});
      let weaponList = comboData.weapon;
      let weaponItems = (comboData.weaponItems = {});

      for (let effectId of effectList) {
        if (this.items.get(effectId) == undefined) continue;

        let effect = this.items.get(effectId);
        effectItems[effectId] = effect;

        if (Number.isNaN(Number(effect.system.encroach.value)))
          encroachStr.push(effect.system.encroach.value);
        else comboData.encroach.value += Number(effect.system.encroach.value);

        if (effect.system.active.state) continue;

        values = this._updateEffectData(
          values,
          effect.system.attributes,
          effect.system.level.value
        );
        if (
          "critical_min" in effect.system.attributes &&
          effect.system.attributes.critical_min.value < critical_min
        )
          critical_min = Number(effect.system.attributes.critical_min.value);
        this._updateSkillData(skills, effect.system.skills);
      }

      if (encroachStr.length > 0)
        comboData.encroach.value += "+" + encroachStr.join("+");

      values = this._updateEffectData(values, comboData.attributes, 0);
      if (
        "critical_min" in comboData.attributes &&
        comboData.attributes.critical_min.value < critical_min
      )
        critical_min = Number(comboData.attributes.critical_min.value);
      this._updateSkillData(skills, comboData.skills);

      for (let weaponId of weaponList) {
        if (this.items.get(weaponId) == undefined) continue;

        let weapon = this.items.get(weaponId);
        weaponItems[weaponId] = weapon;
        values.attack.value += weapon.system.attack;
      }

      comboData.major.value =
        Number(attributes.major.value) + values.major.value;
      comboData.major.dice =
        Number(attributes.major.dice) + values.major_dice.value;
      comboData.major.critical =
        Number(attributes.critical.value) +
        values.critical.value +
        Number(attributes.major.critical) +
        values.major_critical.value;
      if (comboData.major.critical < critical_min)
        comboData.major.critical = critical_min;

      comboData.reaction.value =
        Number(attributes.reaction.value) + values.reaction.value;
      comboData.reaction.dice =
        Number(attributes.reaction.dice) + values.reaction_dice.value;
      comboData.reaction.critical =
        Number(attributes.critical.value) +
        values.critical.value +
        Number(attributes.reaction.critical) +
        values.reaction_critical.value;
      if (comboData.reaction.critical < critical_min)
        comboData.reaction.critical = critical_min;

      comboData.dodge.value =
        comboData.reaction.value +
        Number(attributes.dodge.value) +
        values.dodge.value;
      comboData.dodge.dice =
        comboData.reaction.dice +
        Number(attributes.dodge.dice) +
        values.dodge_dice.value;
      comboData.dodge.critical =
        Number(attributes.critical.value) +
        values.critical.value +
        Number(attributes.dodge.critical) +
        values.dodge_critical.value +
        values.reaction_critical.value;
      if (comboData.dodge.critical < critical_min)
        comboData.dodge.critical = critical_min;

      comboData.attack.value =
        Number(attributes.attack.value) + values.attack.value;
      comboData.add.value = Number(attributes.add.value) + values.add.value;
      comboData.dice.value = Number(attributes.dice.value) + values.dice.value;
      comboData.critical.value =
        Number(attributes.critical.value) + values.critical.value;
      comboData.critical.min = critical_min;
      if (comboData.critical.value < critical_min)
        comboData.critical.value = critical_min;

      if (comboData.roll != "-") {
        comboData.dice.value +=
          comboData[comboData.roll].dice +
          Number(this.system.attributes.encroachment.dice) +
          Number(this.system.attributes.sublimation.dice);
        comboData.add.value += comboData[comboData.roll].value;
        comboData.critical.value =
          comboData[comboData.roll].critical +
          Number(this.system.attributes.sublimation.critical);
      }

      if (comboData.skill != "-" && comboData.skill in skills) {
        let skill = skills[comboData.skill];

        comboData.dice.value += skill.dice;
        comboData.add.value += skill.value;
      }

      if (comboData.base != "-") {
        let base = attributes[comboData.base];

        comboData.dice.value +=
          base.value + values[comboData.base + "_dice"].value;
        comboData.add.value += base.add + values[comboData.base + "_add"].value;
      }

      if (game.ready && c.sheet.rendered) c.render(true);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onCreateDescendantDocuments(
    parent,
    collection,
    documents,
    data,
    options,
    userId
  ) {
    super._onCreateDescendantDocuments(
      parent,
      collection,
      documents,
      data,
      options,
      userId
    );

    for (let doc of documents) {
      if (
        doc.type == "effect" ||
        doc.type == "combo" ||
        doc.type == "rois" ||
        doc.type == "syndrome" ||
        doc.type == "record"
      )
        continue;

      this._addSkill(doc.system.skills);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onUpdateDescendantDocuments(
    parent,
    collection,
    documents,
    changes,
    options,
    userId
  ) {
    super._onUpdateDescendantDocuments(
      parent,
      collection,
      documents,
      changes,
      options,
      userId
    );

    for (let doc of documents) {
      if (
        doc.type == "effect" ||
        doc.type == "combo" ||
        doc.type == "rois" ||
        doc.type == "syndrome" ||
        doc.type == "record"
      )
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
        name: value.name,
        point: 0,
        base: value.base,
        delete: true,
      };

      await this.update({ [`data.attributes.skills.${key}`]: skill });
    }
  }

  _getDiceData(diceOptions) {
    let attributes = this.system.attributes;

    // base와 skill의 기본값이 정의되지 않았을 경우 처리
    let base = this.system.attributes[diceOptions.base] || { value: 0, add: 0 };
    let skill = this.system.attributes.skills[diceOptions.skill] || {
      dice: 0,
      value: 0,
    };

    let dice = base.value || 0;
    let add = base.add || 0;

    // 스킬이 선택된 경우 스킬 값을 추가
    if (diceOptions.skill != null && diceOptions.skill != "-") {
      dice += skill.dice || 0;
      add += skill.value || 0;
    }

    // 추가로 encroachment 및 sublimation 적용
    dice +=
      Number(attributes.dice.value || 0) +
      Number(attributes.encroachment.dice || 0) +
      Number(attributes.sublimation.dice || 0);
    add += Number(attributes.add.value || 0);
    let critical = attributes.critical.value || 10;

    let rollType = diceOptions.rollType || "major";
    dice += Number(attributes[rollType]?.dice || 0);
    add += Number(attributes[rollType]?.value || 0);
    critical += attributes[rollType]?.critical || 0;

    if (critical < attributes.critical.min)
      critical = Number(attributes.critical.min);
    critical += Number(attributes.sublimation.critical || 0);

    return { dice, add, critical };
  }

  async rollDice(title, diceOptions) {
    // diceOptions에 기본값이 없는 경우 처리
    if (!diceOptions.dice || !diceOptions.critical || !diceOptions.add) {
      let { dice, add, critical } = this._getDiceData(diceOptions);
      diceOptions.dice = dice;
      diceOptions.add = add;
      diceOptions.critical = critical;
    }

    // attack 타입의 값을 처리할 때 add를 제대로 반영
    if ("attack" in diceOptions) {
      diceOptions.add += Number(this.system.attributes.add[diceOptions.attack.type]); // 추가 보정치 반영
    }

    // 다이얼로그 내용 생성
    let content = `
        <table style="text-align: center;">
          <tr>
            <th>${game.i18n.localize("DX3rd.Dice")}</th>
            <th>${game.i18n.localize("DX3rd.Critical")}</th>
            <th>${game.i18n.localize("DX3rd.Add")}</th>
          </tr>
          <tr>
            <td><input type='text' id='roll-dice' value='${
              diceOptions.dice
            }'></td>
            <td><input type='text' id='roll-critical' value='${
              diceOptions.critical
            }'></td>
            <td><input type='text' id='roll-add' value='${
              diceOptions.add
            }'></td>
          </tr>
        </table><script>$("#roll-dice").focus()</script>
    `;

    // updateOptions 함수에서 다이얼로그 입력값을 diceOptions에 반영
    let updateOptions = () => {
      // NaN 처리 및 값 반영
      diceOptions.dice = Number($("#roll-dice").val()) || diceOptions.dice;
      diceOptions.critical =
        Number($("#roll-critical").val()) || diceOptions.critical;
      diceOptions.add = Number($("#roll-add").val()) || diceOptions.add;
    };

    // 버튼 생성
    let buttons = {
      major: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("DX3rd.Major"),
        callback: () => {
          updateOptions(); // 수정된 값을 diceOptions에 반영
          diceOptions["rollType"] = "major";
          this._onRollDice(title, diceOptions); // 반영된 값으로 주사위 굴림
        },
      },
      reaction: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("DX3rd.Reaction"),
        callback: () => {
          updateOptions(); // 수정된 값을 diceOptions에 반영
          diceOptions["rollType"] = "reaction";
          this._onRollDice(title, diceOptions); // 반영된 값으로 주사위 굴림
        },
      },
      dodge: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("DX3rd.Dodge"),
        callback: () => {
          updateOptions(); // 수정된 값을 diceOptions에 반영
          diceOptions["rollType"] = "dodge";
          this._onRollDice(title, diceOptions); // 반영된 값으로 주사위 굴림
        },
      },
    };

    if ( "rollType" in diceOptions ) {
      buttons = {
        major: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DX3rd.Roll"),
          callback: () => {
            updateOptions(); // 수정된 값을 diceOptions에 반영
            this._onRollDice(title, diceOptions); // 반영된 값으로 주사위 굴림
          },
        }
      };
    }

    // 다이얼로그 렌더링
    new Dialog({
      title: game.i18n.localize("DX3rd.RollType"),
      content: content,
      buttons: buttons,
      default: "major",
    }).render(true);
  }

  async _onRollDice(title, diceOptions) {
    let attributes = this.system.attributes;
    let rollType = diceOptions.rollType;
    let { dice, add, critical } = diceOptions;

    // 주사위 공식 생성
    let formula = `${dice}dx${critical} + ${add}`;
    let roll = new Roll(formula);
    await roll.roll({ async: true });

    let rollMode = game.settings.get("core", "rollMode");
    let rollData = await roll.render();
    let content = `
      <div class="dx3rd-roll" data-actor-id=${this.id}>
        <h2 class="header"><div class="title">${title}</div></h2>
        ${rollData}
      </div>
    `;

    // attack 버튼에서 추가 기능이 필요한 경우 처리
    if ("attack" in diceOptions) {
      let attack = Number(attributes.attack.value) + diceOptions.attack.value;
      content += `<button class="chat-btn calc-damage" data-attack="${attack}">${game.i18n.localize(
        "DX3rd.DamageRoll"
      )}</button>`;
    }

    ChatMessage.create(
      {
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: content,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        sound: CONFIG.sounds.dice,
        roll: roll,
      },
      { rollMode }
    );

    // 기타 후처리 로직
    if ("key" in diceOptions) {
      await Hooks.call("updateActorEncroach", this, diceOptions.key, "roll");
    }

    if (rollType == "major") Hooks.call("afterMajor", this);
    else if (rollType == "reaction" || rollType == "dodge")
      Hooks.call("afterReaction", this);

    await this.update({
      "system.attributes.sublimation.dice": 0,
      "system.attributes.sublimation.critical": 0,
    });
  }

  // 마술 굴림 추가 //
  async _onSpellRoll(diceOptions) {
    let mind = this.system.attributes.mind.value; // 술자의 【정신】 능력치
    let will = this.system.attributes.skills.will.value; // 술자의 〈의지〉 기능
    let cthulhu = this.system.attributes.skills.cthulhu.value; // 술자의 〈지식: 크툴루〉 기능

    let castingDice = Math.floor((mind + will) / 2); // 마술 굴림 주사위 개수

    let appendDice = this.system.attributes.casting_dice.value;
    let appendAdd = this.system.attributes.casting_add.value;

    let invoke = diceOptions.invoke;
    let evocation = diceOptions.evocation;

    let spelltype = diceOptions.spellType;

    let invokeText = `${invoke}`;
    if (
      diceOptions.spelltype === "Evocation" ||
      diceOptions.spelltype === "EvocationRitual"
    ) {
      invokeText = `${invoke}(${evocation})`;
    }

    new Dialog({
      title: game.i18n.localize("DX3rd.CastingRoll"),
      content: `
        <h2 style="text-align: center;">${game.i18n.localize(
          "DX3rd.CastingDice"
        )}: ${castingDice} / ${game.i18n.localize(
        "DX3rd.Invoke"
      )}: ${invokeText}</h2>
        <table class="calc-dialog">
          <tr>
            <th style="white-space: nowrap;">${game.i18n.localize("DX3rd.AddDice").replace(" ", "<br>")}</th>
            <td><input type="number" id="append-dice" value="${appendDice}" style="width: 100px;"></td>
    
            <th style="white-space: nowrap;">${game.i18n.localize("DX3rd.AddResult").replace(" ", "<br>")}</th>
            <td><input type="number" id="append-add" value="${appendAdd}" style="width: 100px;"></td>
          </tr>
    
          <tr>
            <th style="white-space: nowrap;">${game.i18n.localize("DX3rd.Eibon").replace(" ", "<br>")}</th>
            <td><input type="checkbox" id="eibon"></td>
    
            <th style="white-space: nowrap;">${game.i18n.localize("DX3rd.Angel").replace(" ", "<br>")}</th>
            <td><input type="checkbox" id="angel"></td>
          </tr>
        </table>
      `,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async () => {
            let addDice =
              $("#append-dice").val() != ""
                ? Number($("#append-dice").val())
                : 0;
            let addResult =
              $("#append-add").val() != "" ? Number($("#append-add").val()) : 0;
            let eibonDice = Math.floor(cthulhu / 4);

            // eibon 및 angel 체크박스 상태 확인
            let isEibonChecked = $("#eibon").is(":checked");
            let isAngelChecked = $("#angel").is(":checked");

            // 기본 주사위 계산
            let totalDice = castingDice + addDice;
            let formula = `${totalDice}d10 + ${addResult}`;
            let roll = new Roll(formula);
            await roll.evaluate({ async: true });
            let rollData = await roll.render();
            let total = roll.total;

            // 모든 주사위 결과를 저장할 배열
            let allDiceResults = roll.terms[0].results.map((r) => r.result);

            // 10이 나온 주사위 처리
            let extraDice = 0;
            let tenResults = roll.terms[0].results.filter(
              (r) => r.result === 10
            );
            extraDice += tenResults.length;

            while (extraDice > 0) {
              let extraRoll = new Roll(`${extraDice}d10`);
              await extraRoll.evaluate({ async: true });
              rollData += await extraRoll.render();
              total += extraRoll.total;
              // 추가 주사위 결과를 allDiceResults에 추가
              allDiceResults = allDiceResults.concat(
                extraRoll.terms[0].results.map((r) => r.result)
              );
              extraDice = extraRoll.terms[0].results.filter(
                (r) => r.result === 10
              ).length;
            }

            // 모든 추가 주사위 굴림이 완료된 후 Eibon 및 Angel 처리
            if (isEibonChecked) {
              await handleEibon(
                allDiceResults,
                eibonDice,
                isAngelChecked,
                invoke,
                addResult,
                rollData,
                total,
                roll
              );
            } else if (isAngelChecked) {
              await handleAngel(
                allDiceResults,
                invoke,
                addResult,
                rollData,
                total,
                roll
              );
            } else {
              DisplayResult(
                allDiceResults,
                total,
                invoke,
                evocation,
                rollData,
                roll,
                addResult,
                spelltype
              );
            }
            if ("key" in diceOptions) {
              await Hooks.call(
                "updateActorEncroach",
                this,
                diceOptions.key,
                "roll"
              );
            }
          },
        },
      },
      default: "confirm",
    }).render(true);

    async function handleEibon(
      allDiceResults,
      eibonDice,
      isAngelChecked,
      invoke,
      addResult,
      rollData,
      total,
      roll
    ) {
      let content =
        "<div class='dice-grid' style='display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;'>";
      allDiceResults.forEach((die, index) => {
        content += `
          <div style="display: grid; grid-template-columns: auto auto; align-items: center; justify-items: center; margin: 5px;">
            <span>${die}</span>
            <input type="checkbox" class="eibon-die" data-index="${index}">
          </div>
        `;
      });
      content += "</div>";

      await new Promise((resolve) => {
        new Dialog({
          title: `${game.i18n.localize("DX3rd.Eibon")}`,
          content: `<p>Remove up to ${eibonDice} dice:</p>${content}`,
          buttons: {
            confirm: {
              label: "Confirm",
              callback: () => {
                let selected = $(".eibon-die:checked")
                  .map((_, el) => $(el).data("index"))
                  .get();
                if (selected.length > eibonDice) {
                  ui.notifications.info(
                    `You can only up to ${eibonDice}  die.`
                  );
                  handleEibon(
                    allDiceResults,
                    eibonDice,
                    isAngelChecked,
                    invoke,
                    addResult,
                    rollData,
                    total,
                    roll
                  ); // 다시 다이얼로그 표시
                  return;
                }
                allDiceResults = allDiceResults.filter(
                  (_, index) => !selected.includes(index)
                );
                total =
                  allDiceResults.reduce((sum, val) => sum + val, 0) + addResult;

                // Angel 처리
                if (isAngelChecked) {
                  handleAngel(
                    allDiceResults,
                    invoke,
                    addResult,
                    rollData,
                    total,
                    roll
                  ).then(resolve);
                } else {
                  DisplayResult(
                    allDiceResults,
                    total,
                    invoke,
                    evocation,
                    rollData,
                    roll,
                    addResult,
                    spelltype
                  );
                  resolve();
                }
              },
            },
          },
        }).render(true);
      });
    }

    async function handleAngel(
      allDiceResults,
      invoke,
      addResult,
      rollData,
      total,
      roll
    ) {
      let tensDice = allDiceResults.filter((result) => result === 10);

      if (tensDice.length > 0) {
        let content =
          "<div class='dice-grid' style='display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;'>";
        allDiceResults.forEach((die, index) => {
          content += `
            <div style="display: grid; grid-template-columns: auto auto; align-items: center; justify-items: center; margin: 5px;">
              <span>${die}</span>
              <input type="checkbox" class="angel-die" data-index="${index}">
            </div>
          `;
        });
        content += "</div>";

        await new Promise((resolve) => {
          new Dialog({
            title: `${game.i18n.localize("DX3rd.Angel")}`,
            content: `<p>Remove up to 1 die (optional):</p>${content}`,
            buttons: {
              confirm: {
                label: "Confirm",
                callback: () => {
                  let selected = $(".angel-die:checked")
                    .map((_, el) => $(el).data("index"))
                    .get();
                  if (selected.length > 1) {
                    ui.notifications.info("You can only remove up to 1 die.");
                    handleAngel(
                      allDiceResults,
                      invoke,
                      addResult,
                      rollData,
                      total,
                      roll
                    ); // 다시 다이얼로그 표시
                    return;
                  }
                  // 선택된 주사위만 제거
                  allDiceResults = allDiceResults.filter(
                    (_, index) => !selected.includes(index)
                  );
                  total =
                    allDiceResults.reduce((sum, val) => sum + val, 0) +
                    addResult;
                  DisplayResult(
                    allDiceResults,
                    total,
                    invoke,
                    evocation,
                    rollData,
                    roll,
                    addResult,
                    spelltype
                  );
                  resolve();
                },
              },
            },
          }).render(true);
        });
      } else {
        // Angel 체크박스가 있지만 10이 없는 경우
        total = allDiceResults.reduce((sum, val) => sum + val, 0) + addResult;
        DisplayResult(
          allDiceResults,
          total,
          invoke,
          evocation,
          rollData,
          roll,
          addResult,
          spelltype
        );
      }
    }

    // 결과를 평가하고 출력하는 함수
    function DisplayResult(
      allDiceResults,
      total,
      invoke,
      evocation,
      rollData,
      roll,
      addResult,
      spelltype
    ) {
      let resultText = game.i18n.localize("DX3rd.Failure");

      if (total < invoke) {
        resultText = game.i18n.localize("DX3rd.Failure");
      } else {
        if (!spelltype === "Evocation" || !spelltype === "EvocationRitual") {
          resultText = game.i18n.localize("DX3rd.Success");
        } else {
          if (total >= evocation) {
            resultText = `${game.i18n.localize(
              "DX3rd.Evocation"
            )} ${game.i18n.localize("DX3rd.Success")}`;
          } else {
            resultText = `${game.i18n.localize(
              "DX3rd.Contact"
            )} ${game.i18n.localize("DX3rd.Success")}`;
          }
        }
      }

      // 남은 주사위 중 10이 나온 개수를 계산
      let overflowDice = allDiceResults.filter(
        (result) => result === 10
      ).length;
      let overflowMessage = "";
      if (overflowDice > 0) {
        overflowMessage += `${game.i18n.localize(
          "DX3rd.OverflowDice"
        )}: ${overflowDice}개<br>`;
        if (overflowDice === 1) {
          overflowMessage += `${game.i18n.localize("DX3rd.SpellDisaster")}`;
        } else if (overflowDice >= 2 && overflowDice <= 3) {
          overflowMessage += `${game.i18n.localize("DX3rd.SpellCalamity")}`;
        } else if (overflowDice >= 4) {
          overflowMessage += `${game.i18n.localize("DX3rd.SpellCatastrophe")}`;
        }
      }

      // invoke와 같거나 크다면 매크로 실행
      if (total >= invoke) {
        const macro = game.macros.contents.find(
          (m) => m.name === diceOptions.macro
        );
        if (macro != undefined) {
          macro.execute();
        } else if (diceOptions.macro != "") {
          new Dialog({
            title: "macro",
            content: `Do not find this macro: ${diceOptions.macro}`,
            buttons: {},
          }).render(true);
        }
      }

      let content = `
        <div class="dx3rd-roll">
          <h2 class="header"><div class="title">${game.i18n.localize(
            "DX3rd.SpellResult"
          )}: ${total}</div></h2>
          ${resultText} (${game.i18n.localize("DX3rd.Invoke")}: ${invoke})<br>
          ${overflowMessage}
          ${rollData}
        </div>
      `;

      ChatMessage.create(
        {
          content: content,
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          sound: CONFIG.sounds.dice,
          roll: roll,
        },
        { rollMode: game.settings.get("core", "rollMode") }
      );
    }
  }
  //

  /** @override */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    const current = foundry.utils.getProperty(this.system, attribute);

    // Determine the updates to make to the actor data
    let updates;
    if (isBar) {
      if (isDelta) value = Number(current.value) + value;
      updates = { [`data.${attribute}.value`]: value };
    } else {
      if (isDelta) value = Number(current) + value;
      updates = { [`data.${attribute}`]: value };
    }

    const allowed = Hooks.call(
      "modifyTokenAttribute",
      { attribute, value, isDelta, isBar },
      updates
    );
    return allowed !== false ? this.update(updates) : this;
  }
}
