
export class DX3rdItem extends Item {

  prepareData() {
    super.prepareData();

  }


  async toMessage() {
    let title = `<div class="title">${this.data.name}</div>`;
    if (this.data.img != 'icons/svg/item-bag.svg')
      title = `<img src="${this.data.img}" width="30" height="30">&nbsp&nbsp${title}`; 
    
    let content = `<div class="dx3rd-item-info" data-actor-id=${this.actor.id} data-item-id=${this.id}><h2 class="header">${title}</h2>`

    if (this.type == "effect")
      content += await this._getEffectContent();
    else if (this.type == "combo")
      content += await this._getComboContent();

    else if (this.type == "weapon")
      content += await this._getWeaponContent();
    else if (this.type == "protect")
      content += await this._getProtectContent();
    else if (this.type == "vehicle")
      content += await this._getVehicleContent();
    else if (this.type == "connection")
      content += await this._getConnectionContent();
    else if (this.type == "item")
      content += await this._getItemContent();

    else if (this.type == "rois")
      content += await this._getRoisContent();

    content += `</div>`


    // GM rolls.
    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    };

    await ChatMessage.create(chatData);
  }

  async _getEffectContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Level")}:&nbsp&nbsp</b>
          ${this.data.data.level.value} / ${this.data.data.level.max}</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Timing")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{timing arg}}')({arg: this.data.data.timing}) }</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Skill")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor.data, key: this.data.data.skill}) }</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Difficulty")}:&nbsp&nbsp</b>
          ${this.data.data.difficulty}</td>
        </tr>

        <tr>
          <td><b>${game.i18n.localize("DX3rd.Target")}:&nbsp&nbsp</b>${this.data.data.target}</td>
          <td><b>${game.i18n.localize("DX3rd.Range")}:&nbsp&nbsp</b>${this.data.data.range}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Encroach")}:&nbsp&nbsp</b>${this.data.data.encroach.value}</td>
          <td><b>${game.i18n.localize("DX3rd.Limit")}:&nbsp&nbsp</b>${this.data.data.limit}</td>
        </tr>
      </table>
      <p>${this.data.data.description}</p>
      <button class="chat-btn use-effect">${game.i18n.localize("DX3rd.Use")}</button>

    `

    return content;
  }

  async _getComboContent() {
    let content = `
      <table>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Timing")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{timing arg}}')({arg: this.data.data.timing}) }</td>
          <td><b>${game.i18n.localize("DX3rd.Limit")}:&nbsp&nbsp</b>${this.data.data.limit}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Skill")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor.data, key: this.data.data.skill}) }</td>
          <td><b>${game.i18n.localize("DX3rd.Difficulty")}:&nbsp&nbsp</b>
          ${this.data.data.difficulty}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Target")}:&nbsp&nbsp</b>${this.data.data.target}</td>
          <td><b>${game.i18n.localize("DX3rd.Range")}:&nbsp&nbsp</b>${this.data.data.range}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Attack")}:&nbsp&nbsp</b>${this.data.data.attack.value}</td>
          <td><b>${game.i18n.localize("DX3rd.Critical")}:&nbsp&nbsp</b>${this.data.data.critical.value}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Dice")}:&nbsp&nbsp</b>${this.data.data.dice.value}</td>        
          <td><b>${game.i18n.localize("DX3rd.Encroach")}:&nbsp&nbsp</b>${this.data.data.encroach.value}</td>

        </tr>
      </table>
      <p>${this.data.data.description}</p>
      <button class="chat-btn toggle-btn" data-style="effect-list">${game.i18n.localize("DX3rd.Effect")}</button>
      <div class="effect-list">`;

    for (let [key, e] of Object.entries(this.data.data.effectItems)) {
      content += `
        <div>
          <h4 class="item-name toggle-btn" data-style="item-description">`;
      if (e.img != "icons/svg/item-bag.svg")  
        content += `<img src="${e.img}" width="20" height="20" style="vertical-align : middle;margin-right:8px;">`;

      content += `<span class="item-label">[${e.data.level.value}] ${e.name}<br>
              <span style="color : gray; font-size : smaller;">
                ${game.i18n.localize("DX3rd.Timing")} : ${ Handlebars.compile('{{timing arg}}')({arg: e.data.timing}) } / 
                ${game.i18n.localize("DX3rd.Skill")} : ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor.data, key: e.data.skill}) } / 
                ${game.i18n.localize("DX3rd.Target")} : ${e.data.target} / 
                ${game.i18n.localize("DX3rd.Range")} : ${e.data.range} /
                ${game.i18n.localize("DX3rd.Encroach")} : ${e.data.encroach.value} /
                ${game.i18n.localize("DX3rd.Limit")} : ${e.data.limit}
                <span class="item-details-toggle"><i class="fas fa-chevron-down"></i></span>
              </span>
            </span>
          </h4>
          <div class="item-description">${e.data.description}</div>
        </div>
        `;
    }
    content += `</div>`;

    if (this.data.data.attackRoll != "-" && !this.data.data.weaponSelect) {
      content += `<button class="chat-btn toggle-btn" data-style="weapon-list">${game.i18n.localize("DX3rd.Weapon")}</button>
                    <div class="weapon-list">`;
      for (let [key, e] of Object.entries(this.data.data.weaponItems)) {
        content += `
          <div>
            <h4 class="item-name toggle-btn" data-style="item-description">`;
        if (e.img != "icons/svg/item-bag.svg")  
          content += `<img src="${e.img}" width="20" height="20" style="vertical-align : middle;margin-right:8px;">`;

        content += `<span class="item-label">${e.name}<br>
                <span style="color : gray; font-size : smaller;">
                  ${game.i18n.localize("DX3rd.Timing")} : ${ Handlebars.compile('{{timing arg}}')({arg: e.data.type}) } / 
                  ${game.i18n.localize("DX3rd.Skill")} : ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor.data, key: e.data.skill}) } / 
                  ${game.i18n.localize("DX3rd.Attack")} : ${e.data.range}
                  <span class="item-details-toggle"><i class="fas fa-chevron-down"></i></span>
                </span>
              </span>
            </h4>
            <div class="item-description">${e.data.description}</div>
          </div>
          `;
      }
      content += `</div>`;
    }

    content += `<button class="chat-btn use-combo">${game.i18n.localize("DX3rd.Use")}</button>`;

    return content;
  }


  async _getRoisContent() {
    let typeName = "";
    if (this.data.data.type == "D")
      typeName = game.i18n.localize("DX3rd.Descripted")
    else if (this.data.data.type == "S")
      typeName = game.i18n.localize("DX3rd.Superier")
    else if (this.data.data.type == "M")
      typeName = game.i18n.localize("DX3rd.Memory")
    else if (this.data.data.type == "E")
      typeName = game.i18n.localize("DX3rd.Exhaust")

    let statList = ["titus", "sublimation"]
    let state = {};
    for (let s of statList)
      state[s] = (this.data.data[s]) ? "O" : "X";

    state.positive = (this.data.data.positive.state) ? "O" : "X";
    state.negative = (this.data.data.negative.state) ? "O" : "X";

    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Type")}:&nbsp&nbsp</b>
          ${typeName}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Positive")} [${state.positive}]:&nbsp&nbsp</b>
          ${this.data.data.positive.feeling}</td>
          <td><b>${game.i18n.localize("DX3rd.Negative")} [${state.negative}]:&nbsp&nbsp</b>
          ${this.data.data.negative.feeling}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Titus")}:&nbsp&nbsp</b>
          ${state.titus}</td>
          <td><b>${game.i18n.localize("DX3rd.Sublimation")}:&nbsp&nbsp</b>
          ${state.sublimation}</td>
        </tr>
      </table>
      <p>${this.data.data.description}</p>

    `

    if (!this.data.data.titus && !this.data.data.sublimation)
      content += `<button class="chat-btn titus">${game.i18n.localize("DX3rd.Titus")}</button>`;
    else if (this.data.data.titus && !this.data.data.sublimation)
      content += `<button class="chat-btn sublimation">${game.i18n.localize("DX3rd.Sublimation")}</button>`;

    return content;
  }


  async _getWeaponContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.EquipType")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{timing key}}')({key: this.data.data.type}) }</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Skill")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor.data, key: this.data.data.skill}) }</td>
          <td><b>${game.i18n.localize("DX3rd.Add")}:&nbsp&nbsp</b>
          ${this.data.data.add}</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Attack")}:&nbsp&nbsp</b>${this.data.data.attack}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Guard")}:&nbsp&nbsp</b>
          ${this.data.data.guard}</td>
          <td><b>${game.i18n.localize("DX3rd.Range")}:&nbsp&nbsp</b>
          ${this.data.data.range}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.SellSaving")}:&nbsp&nbsp</b>
          ${this.data.data.saving.difficulty} / ${this.data.data.saving.value}</td>
          <td><b>${game.i18n.localize("DX3rd.EXP")}:&nbsp&nbsp</b>
          ${this.data.data.exp}</td>
        </tr>
      </table>
      <p>${this.data.data.description}</p>
      <button class="chat-btn roll-attack">${game.i18n.localize("DX3rd.AttackRoll")}</button>
    `

    return content;
  }

  async _getProtectContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.EquipType")}:&nbsp&nbsp</b>
          ${ game.i18n.localize("DX3rd.Protect") }</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Dodge")}:&nbsp&nbsp</b>
          ${this.data.data.dodge}</td>
          <td><b>${game.i18n.localize("DX3rd.Init")}:&nbsp&nbsp</b>
          ${this.data.data.init}</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Armor")}:&nbsp&nbsp</b>${this.data.data.armor}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.SellSaving")}:&nbsp&nbsp</b>
          ${this.data.data.saving.difficulty} / ${this.data.data.saving.value}</td>
          <td><b>${game.i18n.localize("DX3rd.EXP")}:&nbsp&nbsp</b>
          ${this.data.data.exp}</td>
        </tr>
      </table>
      <p>${this.data.data.description}</p>

    `

    return content;
  }

  async _getVehicleContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.EquipType")}:&nbsp&nbsp</b>
          ${ game.i18n.localize("DX3rd.Vehicle") }</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Skill")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor.data, key: this.data.data.skill}) }</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.SellSaving")}:&nbsp&nbsp</b>
          ${this.data.data.saving.difficulty} / ${this.data.data.saving.value}</td>
          <td><b>${game.i18n.localize("DX3rd.EXP")}:&nbsp&nbsp</b>
          ${this.data.data.exp}</td>
        </tr>
      </table>
      <p>${this.data.data.description}</p>
      <table>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Attack")}:&nbsp&nbsp</b>
          ${this.data.data.attack}</td>
          <td><b>${game.i18n.localize("DX3rd.Init")}:&nbsp&nbsp</b>
          ${this.data.data.init}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Armor")}:&nbsp&nbsp</b>
          ${this.data.data.armor}</td>
          <td><b>${game.i18n.localize("DX3rd.Move")}:&nbsp&nbsp</b>
          ${this.data.data.move}</td>
        </tr>
      </table>
      <button class="chat-btn roll-attack">${game.i18n.localize("DX3rd.AttackRoll")}</button>

    `

    return content;
  }

  async _getConnectionContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.EquipType")}:&nbsp&nbsp</b>
          ${ game.i18n.localize("DX3rd.Connection") }</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Skill")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor.data, key: this.data.data.skill}) }</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.SellSaving")}:&nbsp&nbsp</b>
          ${this.data.data.saving.difficulty} / ${this.data.data.saving.value}</td>
          <td><b>${game.i18n.localize("DX3rd.EXP")}:&nbsp&nbsp</b>
          ${this.data.data.exp}</td>
        </tr>
      </table>
      <p>${this.data.data.description}</p>

    `

    return content;
  }

  async _getItemContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.EquipType")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{timing key}}')({ key: this.data.data.type}) }</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.SellSaving")}:&nbsp&nbsp</b>
          ${this.data.data.saving.difficulty} / ${this.data.data.saving.value}</td>
          <td><b>${game.i18n.localize("DX3rd.EXP")}:&nbsp&nbsp</b>
          ${this.data.data.exp}</td>
        </tr>
      </table>
      <p>${this.data.data.description}</p>

    `

    return content;
  }


  async applyTargetDialog(macro = true) {
    new Dialog({
      title: game.i18n.localize("DX3rd.SelectTarget"),
      content: `
        <h2><b>${game.i18n.localize("DX3rd.SelectTarget")}</b></h2>
      `,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async () => {
            const macro = game.macros.contents.find(m => (m.data.name === this.data.data.macro));
            if (macro != undefined)
                macro.execute();
            else if (this.data.data.macro != "")
                new Dialog({
                    title: "macro",
                    content: `Do not find this macro: ${this.data.data.macro}`,
                    buttons: {}
                }).render(true);


            if (this.data.data.effect.disable != "-") {
              let targets = game.user.targets;
              for (let t of targets) {
                let a = t.actor;
                this.applyTarget(a);
              }
            }
            Hooks.call("updateActorEncroach", this.actor, this.id, "target");
          }
        }
      },
      close: () => {
        //Hooks.call("updateActorEncroach", this.actor, this.id, "target")
      }
    }, {top: 300, left: 20}).render(true);

  }


  async applyTarget(actor) {
    let attributes = this.data.data.effect.attributes;
    let level = this.data.data.level.value;

    let copy = duplicate(attributes);
    for (const [key, value] of Object.entries(attributes)) {
      if (key == '-' || key == 'critical_min')
        continue;

      let num = value.value.replace("@level", level);
      copy[key].value = String(math.evaluate(num));
    }


    let applied = {};
    applied[this.id] = {
      actorId: this.actor.id,
      itemId: this.id,
      disable: this.data.data.effect.disable,
      attributes: copy
    }
    
    await actor.update({"data.attributes.applied": applied});
  }

  async setTitus() {
    await this.update({"data.titus": true});

    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `${this.data.name}: ${game.i18n.localize("DX3rd.Titus")}`
    };

    await ChatMessage.create(chatData);
  }

  async setSublimation() {
    await this.update({"data.sublimation": true});

    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `${this.data.name}: ${game.i18n.localize("DX3rd.Sublimation")}`
    };

    await ChatMessage.create(chatData);
  }



}