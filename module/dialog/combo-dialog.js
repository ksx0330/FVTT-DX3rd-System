
import { WeaponDialog } from "./weapon-dialog.js";

export class ComboDialog extends Dialog {

  constructor(actor, title, diceOptions, append, options) {
    super(options);

    this.actor = actor;

    this.chatTitle = game.i18n.localize("DX3rd.Combo") + ": " + title; 
    this.skillId = diceOptions.skill;
    this.base = diceOptions.base;

    if (this.skillId != null)
      this.skill = actor.data.data.attributes.skills[this.skillId];
    else
      this.skill = "-";

    this.append = append;

    this.data = {
      title: game.i18n.localize("DX3rd.Combo"),
      content: "",
      buttons: {
        create: {
          label: "Apply",
          callback: () => this._onSubmit()

        }
      }
    };

  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/dx3rd/templates/dialog/combo-dialog.html",
      classes: ["dx3rd", "dialog"],
      width: 600
    });
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.item-label').click(this._onShowItemDetails.bind(this));
    html.find(".echo-item").click(this._echoItemDescription.bind(this));
  }

  /** @override */
  getData() {
    let actorSkills = duplicate(this.actor.data.data.attributes.skills);
    let effectList = [];

    for (let i of this.actor.data.items) {
      let item = i.data;

      if (i.type == 'effect')
        effectList.push(item);
    }

    return {
      title: this.title,
      content: this.data.content,
      buttons: this.data.buttons,
      
      actor: this.actor.data,
      skill: this.skillId,
      base: this.base,
      effectList: effectList,
      actorSkills: actorSkills
    }
  }

  async _onSubmit() {
    let effectList = [];
    let applied = {};
    let key = this.id;
    let encroach = 0;

    await $(".active-effect").each(async (i, val) => {
      if ($(val).is(":checked")) {
        let effect = this.actor.items.get(val.dataset.id);
        encroach += effect.data.data.encroach.value;
        effectList.push(effect);

        let updates = {};
        if (effect.data.data.active.disable != 'notCheck')
            updates["data.active.state"] = true;
        await effect.update(updates);
      }
    });

    Hooks.call("setActorEncroach", this.actor, key, encroach);


    let skill = $("#skill").val();
    let base = $("#base").val();
    let rollType = $("#roll").val();
    let attackRoll = $("#attackRoll").val();


    let content = `<button class="chat-btn toggle-btn" data-style="effect-list">${game.i18n.localize("DX3rd.Effect")}</button>
      <div class="effect-list">`;

    for (let e of effectList) {
      content += `
        <div>
          <h4 class="item-name toggle-btn" data-style="item-description">`;
      if (e.img != "icons/svg/item-bag.svg")  
        content += `<img src="${e.img}" width="20" height="20" style="vertical-align : middle;margin-right:8px;">`;

      content += `<span class="item-label">[${e.data.data.level.value}] ${e.data.name}<br>
              <span style="color : gray; font-size : smaller;">
                ${game.i18n.localize("DX3rd.Timing")} : ${ Handlebars.compile('{{timing arg}}')({arg: e.data.data.timing}) } / 
                ${game.i18n.localize("DX3rd.Skill")} : ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor.data, key: e.data.data.skill}) } / 
                ${game.i18n.localize("DX3rd.Target")} : ${e.data.data.target} / 
                ${game.i18n.localize("DX3rd.Range")} : ${e.data.data.range} /
                ${game.i18n.localize("DX3rd.Encroach")} : ${e.data.data.encroach.value} /
                ${game.i18n.localize("DX3rd.Limit")} : ${e.data.data.limit}
                <span class="item-details-toggle"><i class="fas fa-chevron-down"></i></span>
              </span>
            </span>
          </h4>
          <div class="item-description">${e.data.data.description}</div>
        </div>
        `;
    }
    content += `</div>`;

    

    const diceOptions = {
      "key": key,
      "rollType": rollType,
      "base": base,
      "skill": skill,
      "content": content
    };

    if (attackRoll != "-") {
      let confirm = async (weaponData) => {
        diceOptions["attack"] = {
          "value": weaponData.attack,
          "type": attackRoll
        };

        await this.actor.rollDice(this.chatTitle, diceOptions, this.append);
      }

      new WeaponDialog(this.actor, confirm).render(true);
    } else
      await this.actor.rollDice(this.chatTitle, diceOptions, this.append);


    let getTarget = false;
    let appliedList = [];
    for (let e of effectList) {
      if (e.data.data.effect.disable != "-")
        appliedList.push(e);
      if (e.data.data.getTarget)
        getTarget = true;
    }

    if (!getTarget)
      Hooks.call("updateActorEncroach", this.actor, key, "target");
    else {
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
              let targets = game.user.targets;
              for (let t of targets) {
                let a = t.actor;

                for (let e of appliedList)
                  await e.applyTarget(a);
              }
              Hooks.call("updateActorEncroach", this.actor, key, "target");
            }
          }
        },
        close: () => {
          //Hooks.call("updateActorEncroach", this.actor, key, "target")
        }
      }, {top: 300, left: 20}).render(true);
    }
    


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



}