//Import Modules
import { DX3rdActor } from "./document/actor.js";
import { DX3rdItem } from "./document/item.js";
import { DX3rdActorSheet } from "./sheet/actor-sheet.js";
import { DX3rdItemSheet } from "./sheet/item-sheet.js";
import { DX3rdWorksSheet } from "./sheet/works-sheet.js";
import { DX3rdEffectSheet } from "./sheet/effect-sheet.js";
import { DX3rdComboSheet } from "./sheet/combo-sheet.js";
import { DX3rdRoisSheet } from "./sheet/rois-sheet.js";
import { DX3rdEquipmentSheet } from "./sheet/equipment-sheet.js";

import { WeaponDialog } from "./dialog/weapon-dialog.js";
import { DefenseDialog } from "./dialog/defense-dialog.js";
import { DX3rdDiceTerm } from "./dice/dice-term.js";

import { DX3rdRegisterHelpers } from "./handlebars.js";
import { DisableHooks } from "./disable-hooks.js";
import { SocketController } from "./socket.js";
import { DX3rdCombat } from "./combat.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/**
 * Init hook.
 */
Hooks.once("init", async function () {

  // 기본 상태이상 초기화
  CONFIG.statusEffects = [];

  // 새로운 상태이상 추가
  CONFIG.statusEffects.push({
    id: "berserk",
    label: game.i18n.localize("DX3rd.Berserk"),
    icon: "icons/svg/pawprint.svg",
    disabled: false,
    duration: { rounds: 9999 },
    flags: { "dx3rd": { statusId: "berserk" } },
    changes: []
  });

  CONFIG.statusEffects.push({
    id: "riger",
    label: game.i18n.localize("DX3rd.Riger"),
    icon: "icons/svg/lightning.svg",
    disabled: false,
    duration: { rounds: 9999 },
    flags: { "dx3rd": { statusId: "riger" } }
  });

  CONFIG.statusEffects.push({
    id: "pressure",
    label: game.i18n.localize("DX3rd.Pressure"),
    icon: "icons/svg/net.svg",
    disabled: false,
    duration: { rounds: 9999 },
    flags: { "dx3rd": { statusId: "pressure" } }
  });

  CONFIG.statusEffects.push({
    id: "dazed",
    label: game.i18n.localize("DX3rd.Dazed"),
    icon: "icons/svg/daze.svg",
    disabled: false,
    duration: { rounds: 9999 },
    flags: { "dx3rd": { statusId: "dazed" } }
  });

  CONFIG.statusEffects.push({
    id: "tainted",
    label: game.i18n.localize("DX3rd.Tainted"),
    icon: "icons/svg/acid.svg",
    disabled: false,
    duration: { rounds: 9999 },
    flags: { "dx3rd": { statusId: "tainted" } }
  });

  CONFIG.statusEffects.push({
    id: "hatred",
    label: game.i18n.localize("DX3rd.Hatred"),
    icon: "icons/svg/fire.svg",
    disabled: false,
    duration: { rounds: 9999 },
    flags: { "dx3rd": { statusId: "hatred" } }
  });

  CONFIG.statusEffects.push({
    id: "fear",
    label: game.i18n.localize("DX3rd.Fear"),
    icon: "icons/svg/stoned.svg",
    disabled: false,
    duration: { rounds: 9999 },
    flags: { "dx3rd": { statusId: "fear" } }
  });

  CONFIG.statusEffects.push({
    id: "fly",
    label: game.i18n.localize("DX3rd.Fly"),
    icon: "icons/svg/wing.svg",
    disabled: false,
    duration: { rounds: 9999 },
    flags: { "dx3rd": { statusId: "fly" } }
  });

  CONFIG.statusEffects.push({
    id: "stealth",
    label: game.i18n.localize("DX3rd.Stealth"),
    icon: "icons/svg/blind.svg",
    disabled: false,
    duration: { rounds: 9999 },
    flags: { "dx3rd": { statusId: "stealth" } }
  });

  CONFIG.statusEffects.push({
    id: "boarding",
    label: game.i18n.localize("DX3rd.Boarding"),
    icon: "icons/svg/target.svg",
    disabled: false,
    duration: { rounds: 9999 },
    flags: { "dx3rd": { statusId: "boarding" } }
  });

  // CONFIG.debug.hooks = true;
  console.log(`Initializing Double Cross 3rd System`);

  game.DX3rd = {
    baseSkills: game.system.model.Actor.character.attributes.skills,
    itemUsage: {},
    DamageDialog: [],
  };

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dx3rd", DX3rdActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dx3rd", DX3rdWorksSheet, {
    types: ["works"],
    makeDefault: true,
  });
  Items.registerSheet("dx3rd", DX3rdEffectSheet, {
    types: ["effect"],
    makeDefault: true,
  });
  Items.registerSheet("dx3rd", DX3rdComboSheet, {
    types: ["combo"],
    makeDefault: true,
  });
  Items.registerSheet("dx3rd", DX3rdEffectSheet, {
    types: ["spell"],
    makeDefault: true,
  });
  Items.registerSheet("dx3rd", DX3rdEffectSheet, {
    types: ["psionic"],
    makeDefault: true,
  });
  Items.registerSheet("dx3rd", DX3rdRoisSheet, {
    types: ["rois"],
    makeDefault: true,
  });

  Items.registerSheet("dx3rd", DX3rdEquipmentSheet, {
    types: ["weapon", "protect", "vehicle", "connection", "item"],
    makeDefault: true,
  });
  Items.registerSheet("dx3rd", DX3rdItemSheet, { makeDefault: false });

  CONFIG.Actor.documentClass = DX3rdActor;
  CONFIG.Item.documentClass = DX3rdItem;
  CONFIG.Dice.terms.x = DX3rdDiceTerm;

  DX3rdRegisterHelpers.init();
  DisableHooks.init();
  SocketController.init();

  CONFIG.Combat.documentClass = DX3rdCombat;
  CONFIG.Combat.initiative.formula = "@attributes.init.value";

  Roll.TOOLTIP_TEMPLATE = "systems/dx3rd/templates/dice/tooltip.html";
  DiceTerm.fromMatch = (match) => {
    let [number, denomination, modifiers, flavor] = match.slice(1);

    // Get the denomination of DiceTerm
    denomination = denomination.toLowerCase();
    const cls =
      denomination in CONFIG.Dice.terms
        ? CONFIG.Dice.terms[denomination]
        : CONFIG.Dice.terms.d;
    if (!getParentClasses(cls).includes(DiceTerm)) {
      throw new Error(
        `DiceTerm denomination ${denomination} not registered to CONFIG.Dice.terms as a valid DiceTerm class`
      );
    }

    // Get the term arguments
    number = Number.isNumeric(number) ? parseInt(number) : 1;
    const faces = Number.isNumeric(denomination)
      ? parseInt(denomination)
      : null;

    if (denomination == "x")
      return new cls({
        number,
        faces,
        modifiers: [modifiers],
        options: { flavor },
      });

    // Match modifiers
    modifiers = Array.from(
      (modifiers || "").matchAll(DiceTerm.MODIFIER_REGEXP)
    ).map((m) => m[0]);

    // Construct a term of the appropriate denomination
    return new cls({ number, faces, modifiers, options: { flavor } });
  };
});

Hooks.once("ready", async function () {
  game.settings.set("core", "defaultToken", { disposition: 0 });
});

Hooks.on("setActorCost", (actor, key, type, cost) => {
  game.DX3rd.itemUsage[key] = {
    actor: actor,
    type: type, // encroachment, hp
    cost: cost,
    target: false,
    roll: false,
  };
});

Hooks.on("updateActorCost", async (actor, key, usage) => {
  let itemUsage = game.DX3rd.itemUsage[key];
  itemUsage[usage] = true;
  if (itemUsage.target && itemUsage.roll) {
    const last = Number(actor.system.attributes[itemUsage.type].value);
    let cost = (itemUsage.type == "encroachment") ? last + itemUsage.cost : last - itemUsage.cost;

    let chatData = {
      speaker: ChatMessage.getSpeaker({ actor: actor }),
    }

    if (Number.isNumeric(itemUsage.cost))
      chatData.content = `<div class="context-box">${actor.name}(${itemUsage.type}): ${last} -> ${cost} (${itemUsage.type != "hp" ? '+' : '-'}${itemUsage.cost})</div>`;
    else {
      let roll = new Roll(itemUsage.cost);
      await roll.roll({ async: true });
  
      let rollData = await roll.render();
  
      cost = (itemUsage.type == "encroachment") ? last + roll.total : last - roll.total;
      chatData.content = `
        <div class="dx3rd-roll" data-actor-id=${actor.id}>
          <h2 class="header"><div class="title">${actor.name}: ${last} -> ${cost} (${itemUsage.type != "hp" ? '+' : '-'}${roll.total})</div></h2>
          ${rollData}
        </div>
      `;
      chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
      chatData.sound = CONFIG.sounds.dice;
      chatData.roll = roll;
    }
  
    await actor.update({ [`system.attributes.${itemUsage.type}.value`]: cost });
    let rollMode = game.settings.get("core", "rollMode");
    ChatMessage.create(chatData, { rollMode });
  }
});

Hooks.on("updateActorDialog", function () {
  let reload = (dialogs) => {
    let d = dialogs.filter((e) => e._state != -1);
    if (d.length != 0) {
      for (let dialog of d) dialog.render(true);
    }

    return d;
  };

  game.DX3rd.DamageDialog = reload(game.DX3rd.DamageDialog);
});

Hooks.on("updateItem", () => Hooks.call("updateActorDialog"));

Hooks.on("getSceneControlButtons", function (controls) {
  controls[0].tools.push({
    name: "EnterScene",
    title: game.i18n.localize("DX3rd.EnterScene"),
    icon: "fas fa-dice",
    visible: true,
    onClick: () => {
      if (game.user.character != null) {
        let actor = game.actors.get(game.user.character.id);
        Hooks.call("enterScene", actor);
      }

      let share = game.user.id;
      let users = game.users.filter(
        (u) => u.active && u.character != null && u.character.id !== share
      );
      for (let user of users) {
        game.socket.emit("system.dx3rd", {
          id: "enterScene",
          sender: game.user.id,
          receiver: user.id,
          data: {
            actorId: user.character.id,
          },
        });
      }
    },
    button: true,
  });
});

Hooks.on("deleteCombat", async function (data, delta) {
  let actors = data.turns.reduce((acc, i) => {
    acc.push(i.actor);
    return acc;
  }, []);

  Hooks.call("afterCombat", actors);
});

Hooks.on("updateCombat", async function (data, delta) {
  if (data.round == 0) return;

  if (delta.round != undefined) {
    let actors = data.turns.reduce((acc, i) => {
      acc.push(i.actor);
      return acc;
    }, []);

    Hooks.call("afterRound", actors);
  }
});

async function createItemMacro(dropData, slot) {
  // Get the dropped document
  const doc = await Item.fromDropData(dropData);
  if (!doc) return;

  // Get the Macro to add to the bar
  let macro;
  if (dropData.type === "Macro") {
    macro = game.macros.has(doc.id) ? doc : await Item.create(doc.toObject());
  } else {
    macro = await Macro.implementation.create({
      name: doc.name,
      type: CONST.MACRO_TYPES.SCRIPT,
      img: doc.img,
      command: `let item = await fromUuid("${dropData.uuid}");\nitem.toMessage();`,
    });
  }

  // Assign the macro to the hotbar
  if (!macro) return;
  game.user.assignHotbarMacro(macro, slot, { fromSlot: dropData.slot });
}

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type == "Item") {
    createItemMacro(data, slot);
    return false;
  }
});

Hooks.on("renderChatLog", (app, html, data) => chatListeners(html));
Hooks.on("renderChatPopout", (app, html, data) => chatListeners(html));

async function chatListeners(html) {

  async function usingEffect(item) {
    let updates = {};
    if ("active" in item.system && item.system.active.disable != "notCheck") {
      updates["system.active.state"] = true;
    }
    if ("used" in item.system && item.system.used.disable != "notCheck") {
      updates["system.used.state"] = item.system.used.state + 1;
    }
    await item.update(updates);
  }

  async function runningMacro(macroName, actor, item) {
    const macro = game.macros.contents.find(
      (m) => m.name === macroName
    );
    if (macro != undefined) {
      let scope = {};
      scope.actor = actor;
      scope.item = item;
      await macro.execute(scope);
    } else if (macroName !== "")
      new Dialog({
        title: "macro",
        content: `Do not find this macro: ${macroName}`,
        buttons: {},
      }).render(true);
  }

  async function targeting(targets, actor) {
    let names = targets.map((target) => target.name).join(", ");
    let message = `
          <div class="dx3rd-roll">
              <div class="context-box">
                  ${game.i18n.localize("DX3rd.Target")}: ${names}
              </div>
          </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: message,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
    });
  }

  // 채팅창에 호출된 effect 아이템의 사용 버튼을 누를 경우 실행되는 기능 구현 //
  html.on("click", ".use-effect", async (ev) => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    // 상태이상: 중압에 의한 오토액션 불가 //
    const timing = item.system.timing;
    if (actor.system.conditions.pressure?.active && timing === "auto") {
      ui.notifications.info(`You cannot use auto action while in pressure.`);
      return;
    }

    const berserkActive = actor.system.conditions.berserk?.active;
    const berserkType = actor.system.conditions.berserk?.type;

    // 상태이상: 폭주에 의한 리액션 불가 //
    const isUnableReaction = berserkActive &&
      ["normal", "slaughter", "battlelust", "delusion", "hatred"].includes(berserkType);

    if (isUnableReaction && timing === "reaction") {
      ui.notifications.info(`You cannot use reaction while in berserk.`);
      return;  // 조건이 만족되면 기능 실행 중단
    }

    let skill = item.system.skill;
    let base = "";
    const rollType = item.system.roll;
    const attackRoll = item.system.attackRoll;
    const encroach = Number.isNaN(Number(item.system.encroach.value))
      ? item.system.encroach.value
      : Number(item.system.encroach.value);

    let mainStat = ["body", "sense", "mind", "social"];
    if (mainStat.includes(skill)) {
      base = skill;
      skill = "-";
    }

    if (skill in actor.system.attributes.skills) {
      base = actor.system.attributes.skills[skill].base;
    }

    let used = item.system.used;
    if (used.disable != "notCheck") {
      let max = used.max + (used.level ? item.system.level.value : 0);
      if (used.state >= max) {
        ui.notifications.info(`Do not use this effect: ${item.name}`);
        return;
      }
    }

    let targets = Array.from(game.user.targets || []);
    if (item.system.getTarget) {
      if (targets.length > 0)
        targeting(targets, actor);
      else {
        ui.notifications.info(`${game.i18n.localize("DX3rd.SelectTarget")}`);
        return;
      }
    }

    const runAction = async() => {
      Hooks.call("setActorCost", actor, item.id, "encroachment", encroach);

      usingEffect(item);
      runningMacro(item.system.macro, actor, item);
      if (item.system.effect.disable != "-") {
        for (let target of targets.map((t) => t.actor))
          await item.applyTarget(target);
      }
  
      Hooks.call("updateActorCost", actor, item.id, "target");
      
      if (rollType === "-")
        Hooks.call("updateActorCost", actor, item.id, "roll");
      else {
        const diceOptions = {
          key: item.id,
          rollType: rollType,
          base: base,
          skill: skill,
        };  
  
        if (attackRoll == "-") {
          await actor.rollDice(item.name, diceOptions);
        } else {
          let confirm = async (weaponData) => {
            diceOptions["attack"] = {
              value: weaponData.attack,
              type: item.system.attackRoll,
            };
            await actor.rollDice(item.name, diceOptions);
          };
          new WeaponDialog(actor, confirm).render(true);
        }
      }
    }

    const hasStealthTarget = targets.some(target => target.actor?.system.conditions.stealth?.active);

    if (hasStealthTarget) {
      const stealthTargets = targets
      .filter(target => target.actor?.system.conditions.stealth?.active)
      .map(target => target.actor?.name);

      new Dialog({
        title: game.i18n.localize("DX3rd.StealthTargetCheck"),
        content: `
          <p>${game.i18n.localize("DX3rd.StealthCharacter")}:</p>
          <ul>
            ${stealthTargets.map(name => `<li>${name}</li>`).join('')}
          </ul>
          <hr>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: `Confirm`,
            callback: () => runAction()
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: `Cancel`
          }
        },
        default: "cancel"
      }).render(true);
    } else {
      runAction()
    }
  });

  // 채팅창에 호출된 combo 아이템의 사용 버튼을 누를 경우 실행되는 기능 구현 //
  html.on("click", ".use-combo", async (ev) => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    // 상태이상: 중압에 의한 오토액션 불가 //
    const timing = item.system.timing;
    if (actor.system.conditions.pressure?.active && timing === "auto") {
      ui.notifications.info(`You cannot use auto action while in pressure.`);
      return;
    }

    const berserkActive = actor.system.conditions.berserk?.active;
    const berserkType = actor.system.conditions.berserk?.type;

    // 상태이상: 폭주에 의한 리액션 불가 //
    const isUnableReaction = berserkActive &&
      ["normal", "slaughter", "battlelust", "delusion", "hatred"].includes(berserkType);

    if (isUnableReaction && timing === "reaction") {
      ui.notifications.info(`You cannot use reaction while in berserk.`);
      return;  // 조건이 만족되면 기능 실행 중단
    }

    const skill = item.system.skill;
    const base = item.system.base;
    const rollType = item.system.roll;
    const attackRoll = item.system.attackRoll;
    const encroach = Number.isNaN(Number(item.system.encroach.value))
      ? item.system.encroach.value
      : Number(item.system.encroach.value);

    const effectItems = item.system.effect;

    let usedCheck = true;

    // 모든 효과 항목 확인
    for (let e of effectItems) {
      if (e === "-") continue;

      let effect = actor.items.get(e);
      let used = effect.system.used;

      if (used.disable !== "notCheck") {
        let max = used.max + (used.level ? effect.system.level.value : 0);
        if (used.state >= max) {
          ui.notifications.info(`Do not use this effect: ${effect.name}`);
          usedCheck = false;
        }
      }
    }

    if (!usedCheck) return;

    let targets = Array.from(game.user.targets || []);
    if (item.system.getTarget) {
      if (targets.length > 0)
        targeting(targets, actor);
      else {
        ui.notifications.info(`${game.i18n.localize("DX3rd.SelectTarget")}`);
        return;
      }
    }

    const runAction = async () => {
      // 효과와 매크로 실행
      for (let e of effectItems) {
        if (e === "-") continue;

        let effect = actor.items.get(e);
        if (effect.system.effect.disable != "-") {
          for (let target of targets.map((t) => t.actor))
            await effect.applyTarget(target);
        }

        if (effect.system.macro !== "")
          await runningMacro(effect.system.macro);

        await usingEffect(effect);
      }

      Hooks.call("setActorCost", actor, item.id, "encroachment", encroach);

      await usingEffect(item);
      await runningMacro(item.system.macro, actor, item);

      Hooks.call("updateActorCost", actor, item.id, "target");

      if (rollType === "-")
        Hooks.call("updateActorCost", actor, item.id, "roll");
      else {
        const diceOptions = {
          key: item.id,
          rollType: rollType,
          base: base,
          skill: skill,
        };

        if (attackRoll == "-") {
          await actor.rollDice(item.name, diceOptions);
        } else {
          if (item.system.weaponSelect) {
            let confirm = async (weaponData) => {
              diceOptions["attack"] = {
                value: weaponData.attack,
                type: item.system.attackRoll,
              };
              await actor.rollDice(item.name, diceOptions);
            };
            new WeaponDialog(actor, confirm).render(true);

          } else {
            const weaponItems = Object.values(item.system.weaponItems);
            let attack = await weaponItems.reduce(
              (acc, v) => acc + v.system.attack,
              0
            );

            diceOptions["attack"] = {
              value: attack,
              type: attackRoll,
            };

            await actor.rollDice(item.name, diceOptions);
          }
        }
      }
    }

    const hasStealthTarget = targets.some(target => target.actor?.system.conditions.stealth?.active);

    if (hasStealthTarget) {
      const stealthTargets = targets
      .filter(target => target.actor?.system.conditions.stealth?.active)
      .map(target => target.actor?.name);

      new Dialog({
        title: game.i18n.localize("DX3rd.StealthTargetCheck"),
        content: `
          <p>${game.i18n.localize("DX3rd.StealthCharacter")}:</p>
          <ul>
            ${stealthTargets.map(name => `<li>${name}</li>`).join('')}
          </ul>
          <hr>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: `Confirm`,
            callback: () => runAction()
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: `Cancel`
          }
        },
        default: "cancel"
      }).render(true);
    } else {
      runAction()
    }
  });

  // 채팅창에 호출된 spell 아이템의 사용 버튼을 누를 경우 실행되는 기능 구현 //
  html.on("click", ".use-spell", async (ev) => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    const title = item.name;
    const rollType = item.system.roll;
    const spellType = item.system.spelltype;
    const invoke = item.system.invoke?.value ?? 0;
    const evocation = item.system.evocation?.value ?? 0;
    const macroName = item.system.macro;

    const encroach = Number.isNaN(Number(item.system.encroach.value))
      ? item.system.encroach.value
      : Number(item.system.encroach.value);

    let targets = Array.from(game.user.targets || []);
    if (item.system.getTarget) {
      if (targets.length > 0) {
        targeting(targets, actor);
      } else {
        ui.notifications.info(`${game.i18n.localize("DX3rd.SelectTarget")}`);
        return;
      }
    }

    const runAction = async () => { 
      Hooks.call("setActorCost", actor, item.id, "encroachment", encroach);

      usingEffect(item);
  
      Hooks.call("updateActorCost", actor, item.id, "target");
      
      if (rollType === "-") {
        runningMacro(item.system.macro, actor, item);
        Hooks.call("updateActorCost", actor, item.id, "roll");
      } else {
        const diceOptions = {
          key: item.id,
          rollType: rollType,
          spelltype: spellType,
          invoke: invoke,
          evocation: evocation,
          macro: macroName,
          item: item,
        };
  
        await actor._onSpellRoll(diceOptions);
      }
    }

    const hasStealthTarget = targets.some(target => target.actor?.system.conditions.stealth?.active);

    if (hasStealthTarget) {
      const stealthTargets = targets
        .filter(target => target.actor?.system.conditions.stealth?.active)
        .map(target => target.actor?.name);

      new Dialog({
        title: game.i18n.localize("DX3rd.StealthTargetCheck"),
        content: `
      <p>${game.i18n.localize("DX3rd.StealthCharacter")}:</p>
      <ul>
        ${stealthTargets.map(name => `<li>${name}</li>`).join('')}
      </ul>
      <hr>
    `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: `Confirm`,
            callback: () => runAction()
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: `Cancel`
          }
        },
        default: "cancel"
      }).render(true);
    } else {
      runAction()
    }
  });

  // 채팅창에 호출된 psionic 아이템의 사용 버튼을 누를 경우 실행되는 기능 구현 //
  html.on("click", ".use-psionic", async (ev) => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    // 상태이상: 중압에 의한 오토액션 불가 //
    const timing = item.system.timing;
    if (actor.system.conditions.pressure?.active && timing === "auto") {
      ui.notifications.info(`You cannot use auto action while in pressure.`);
      return;
    }

    const berserkActive = actor.system.conditions.berserk?.active;
    const berserkType = actor.system.conditions.berserk?.type;

    // 상태이상: 폭주에 의한 리액션 불가 //
    const isUnableReaction = berserkActive &&
      ["normal", "slaughter", "battlelust", "delusion", "hatred"].includes(berserkType);

    if (isUnableReaction && timing === "reaction") {
      ui.notifications.info(`You cannot use reaction while in berserk.`);
      return;  // 조건이 만족되면 기능 실행 중단
    }

    let skill = item.system.skill;
    let base = "";
    const rollType = item.system.roll;
    const attackRoll = item.system.attackRoll;

    let hp = item.system.hp.value;
    if (Number.isNumeric(hp))
      hp = Number(hp);
    else {
      let roll = new Roll(hp);
      await roll.roll({ async: true });

      let rollData = await roll.render();
      let chatData = {
        speaker: ChatMessage.getSpeaker({ actor: actor }),
      }

      chatData.content = `
        <div class="dx3rd-roll" data-actor-id=${actor.id}>
          <h2 class="header"><div class="title">${item.name}: HP -${roll.total}</div></h2>
          ${rollData}
        </div>
      `;
      chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
      chatData.sound = CONFIG.sounds.dice;
      chatData.roll = roll;
      
      let rollMode = game.settings.get("core", "rollMode");
      ChatMessage.create(chatData, { rollMode });

      hp = roll.total;
      console.log(actor.system.attributes.hp.value - hp < 0);
      if (actor.system.attributes.hp.value - hp < 0) {
        ui.notifications.info(`Do not use this psionic: ${item.name}`);
        return;
      }
    }

    let mainStat = ["body", "sense", "mind", "social"];
    if (mainStat.includes(skill)) {
      base = skill;
      skill = "-";
    }

    if (skill in actor.system.attributes.skills) {
      base = actor.system.attributes.skills[skill].base;
    }

    let used = item.system.used;
    if (used.disable != "notCheck") {
      let max = used.max + (used.level ? item.system.level.value : 0);
      if (used.state >= max) {
        ui.notifications.info(`Do not use this psionic: ${item.name}`);
        return;
      }
    }

    let targets = Array.from(game.user.targets || []);
    if (item.system.getTarget) {
      if (targets.length > 0)
        targeting(targets, actor);
      else {
        ui.notifications.info(`${game.i18n.localize("DX3rd.SelectTarget")}`);
        return;
      }
    }

    const runAction = async () => { 
      Hooks.call("setActorCost", actor, item.id, "hp", hp);

      usingEffect(item);
      runningMacro(item.system.macro, actor, item);
      if (item.system.effect.disable != "-") {
        for (let target of targets.map((t) => t.actor))
          await item.applyTarget(target);
      }
  
      Hooks.call("updateActorCost", actor, item.id, "target");
      
      if (rollType === "-")
        Hooks.call("updateActorCost", actor, item.id, "roll");
      else {
        const diceOptions = {
          key: item.id,
          rollType: rollType,
          base: base,
          skill: skill,
        };  
  
        if (attackRoll == "-") {
          await actor.rollDice(item.name, diceOptions);
        } else {
          let confirm = async (weaponData) => {
            diceOptions["attack"] = {
              value: weaponData.attack,
              type: item.system.attackRoll,
            };
            await actor.rollDice(item.name, diceOptions);
          };
          new WeaponDialog(actor, confirm).render(true);
        }
      }
    }

    const hasStealthTarget = targets.some(target => target.actor?.system.conditions.stealth?.active);
    if (hasStealthTarget) {
      const stealthTargets = targets
        .filter(target => target.actor?.system.conditions.stealth?.active)
        .map(target => target.actor?.name);

      new Dialog({
        title: game.i18n.localize("DX3rd.StealthTargetCheck"),
        content: `
      <p>${game.i18n.localize("DX3rd.StealthCharacter")}:</p>
      <ul>
        ${stealthTargets.map(name => `<li>${name}</li>`).join('')}
      </ul>
      <hr>
    `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: `Confirm`,
            callback: () => runAction()
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: `Cancel`
          }
        },
        default: "cancel"
      }).render(true);
    } else {
      runAction()
    }
  });

  html.on("click", ".roll-attack", async (ev) => {
    // 현재 선택된 타겟들 가져오기
    const targets = Array.from(game.user.targets || []);
    if(targets.length < 1) {
      ui.notifications.info(`${game.i18n.localize("DX3rd.SelectTarget")}`);
      return;
    }

    const runAction = async () => { 
      ev.preventDefault();
      const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
      const actor = game.actors.get(itemInfo.dataset.actorId);
      const item = actor.items.get(itemInfo.dataset.itemId);
  
      // hatred 상태 이상 시 조건 확인
      if (actor.system.conditions.hatred?.active) {
        const hatredTarget = actor.system.conditions.hatred.target;
        const isHatredMatched = targets.some(target => target.actor?.name === hatredTarget);
  
        if (!isHatredMatched) {
          ui.notifications.info(`You must attck hatred target(${hatredTarget}) while in hatred.`);
          return;
        }
      }
  
      const id = item.system.skill;
      const skill = actor.system.attributes.skills[id];
      const title =
        skill.name.indexOf("DX3rd.") != -1
          ? game.i18n.localize(skill.name)
          : skill.name;
      const type = item.type == "vehicle" ? "melee" : item.system.type;
  
      const diceOptions = {
        rollType: "major",
        attack: {
          value: item.system.attack,
          type: type,
        },
        base: skill.base,
        skill: id,
      };
  
      await actor.rollDice(title, diceOptions);
    }

    const hasStealthTarget = targets.some(target => target.actor?.system.conditions.stealth?.active);

    if (hasStealthTarget) {
      const stealthTargets = targets
        .filter(target => target.actor?.system.conditions.stealth?.active)
        .map(target => target.actor?.name);

      new Dialog({
        title: game.i18n.localize("DX3rd.StealthTargetCheck"),
        content: `
      <p>${game.i18n.localize("DX3rd.StealthCharacter")}:</p>
      <ul>
        ${stealthTargets.map(name => `<li>${name}</li>`).join('')}
      </ul>
      <hr>
    `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: `Confirm`,
            callback: () => runAction()
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: `Cancel`
          }
        },
        default: "cancel"
      }).render(true);
    } else {
      runAction()
    }
  });

  html.on("click", ".calc-damage", async (ev) => {
    ev.preventDefault();
    const data = ev.currentTarget.dataset;

    const actorId = data.actorid;
    const actor = game.actors.get(actorId);

    const attack = Number(data.attack);
    const damage = Number(data.damage);
    const fear = Number(data.fear)
    const sublimation_damage = Number(actor.system.attributes.sublimation_damage_roll?.value ?? 0);
    ui.notifications.info(`${sublimation_damage}`);

    const appendDamageRoll = damage + fear + sublimation_damage;

    const rollResult = Number(
      $(ev.currentTarget).parent().find(".dice-total").first().text()
    );

    let content = `
            <h2 style="text-align: center;">[${rollResult} / 10 + 1 + ${appendDamageRoll}]D10 + ${attack}</h2>
            <table class="calc-dialog">
              <tr>
                <th>${game.i18n.localize("DX3rd.IgnoreArmor")}</th>
                <td><input type="checkbox" id="ignore-armor"></td>

                <th>${game.i18n.localize("DX3rd.AddResult")}</th>
                <td><input type="number" id="add-result"></td>

                <th>${game.i18n.localize("DX3rd.AddDice")}</th>
                <td><input type="number" id="add-dice"></td>
              </tr>
              <tr>
                <th>${game.i18n.localize("DX3rd.AddDamage")}</th>
                <td colspan="5"><input type="number" id="add-damage"></td>
              </tr>
            </table>   
    `

    if (actor.system.conditions.berserk?.active && actor.system.conditions.berserk.type === "tourture") {
      content += `
          <table style="text-align: center;">
            <tr>
              <th>${game.i18n.localize("DX3rd.Mutation")}: ${game.i18n.localize("DX3rd.UrgeTourture")}</th>
              <th></th>
              <td><input type="checkbox" id="tourture" "checked"></td>
            </tr>
          </table>
          `
    }

    new Dialog({
      title: game.i18n.localize("DX3rd.CalcDamage"),
      content: content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async () => {
            let ignoreArmor = $("#ignore-armor").is(":checked");
            let addResult =
              $("#add-result").val() != "" ? Number($("#add-result").val()) : 0;
            let addDamage =
              $("#add-damage").val() != "" ? Number($("#add-damage").val()) : 0;
            let addDice =
              $("#add-dice").val() != "" ? Number($("#add-dice").val()) : 0;
            let formula = `${
              parseInt((rollResult + addResult) / 10) + 1 + appendDamageRoll + addDice
            }d10 + ${attack + addDamage}`;
            if ($("#tourture").is(":checked")) {
              formula = `${
                parseInt((rollResult + addResult) / 10) + 1 + appendDamageRoll + addDice
              }d10 + ${attack + addDamage - 20}`;
            }

            let roll = new Roll(formula);
            await roll.roll({ async: true });

            let rollMode = game.settings.get("core", "rollMode");
            let rollData = await roll.render();
            let content = `
                <div class="dx3rd-roll">
                  <h2 class="header"><div class="title">${game.i18n.localize(
                    "DX3rd.CalcDamage"
                  )}</div></h2>
                  ${rollData}
                  <button class="chat-btn apply-damage" data-damage="${
                    roll.total
                  }" data-ignore-armor="${ignoreArmor}">${game.i18n.localize(
              "DX3rd.ApplyDamage"
            )}</button>
                </div>
              `;

            ChatMessage.create(
              {
                content: content,
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                sound: CONFIG.sounds.dice,
                roll: roll,
              },
              { rollMode }
            );
            await actor.update({
              "system.attributes.sublimation_damage_roll.value": 0
            });
          },
        },
      },
      default: "confirm",
    }).render(true);
  });

  html.on("click", ".apply-damage", async (ev) => {
    event.preventDefault();
    const dataset = ev.currentTarget.dataset;
    const damage = Number(dataset.damage);
    const ignoreArmor = dataset.ignoreArmor == "true";
    const data = { ignoreArmor: ignoreArmor };

    const targets = game.users.get(game.user.id).targets;
    for (var target of targets) {
      let actor = target.actor;
      let actorData = actor.system;
      let realDamage = damage;

      let share = game.user.id;
      for (let user of game.users)
        if (
          user.active &&
          user.character != null &&
          user.character.id === actor.id
        ) {
          share = user.id;
          break;
        }

      if (share == game.user.id)
        Hooks.call("applyDamage", { actor, data: { data, realDamage } });
      else {
        game.socket.emit("system.dx3rd", {
          id: "applyDamage",
          sender: game.user.id,
          receiver: share,
          data: {
            actorId: actor.id,
            data,
            realDamage,
          },
        });
      }
    }
  });

  html.on("click", ".toggle-btn", async (ev) => {
    ev.preventDefault();
    const toggler = $(ev.currentTarget);
    const style = ev.currentTarget.dataset.style;
    const item = toggler.parent();
    const description = item.find("." + style);

    toggler.toggleClass("open");
    description.slideToggle();
  });

  html.on("click", ".titus", async (ev) => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    await item.setTitus();
  });

  html.on("click", ".sublimation", async (ev) => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    await item.setSublimation();
  });

  html.on("click", ".use-item", async (event) => {
    event.preventDefault();
    const itemInfo = event.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    if (item.system.quantity.value < 1) return;

    await item.use(actor);
  });
}

Hooks.on("applyDamage", ({ actor, data }) => {
  new DefenseDialog(actor, data).render(true);
});

Hooks.on("enterScene", (actor) => {
  let enterDialog = new Dialog({
    title: game.i18n.localize("DX3rd.EnterScene"),
    content: `
      <h2>${game.i18n.localize("DX3rd.EnterScene")}</h2>
    `,
    buttons: {
      one: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("DX3rd.EnterScene"),
        callback: async () => {
          let formula = `1D10`;

          let roll = new Roll(formula);
          await roll.roll({ async: true });

          let before = actor.system.attributes.encroachment.value;
          let after = Number(before) + Number(roll.total);

          await actor.update({ "system.attributes.encroachment.value": after });

          let rollMode = game.settings.get("core", "rollMode");
          let rollData = await roll.render();
          let content = `
            <div class="dx3rd-roll">
              <h2 class="header"><div class="title">${
                actor.name
              } ${game.i18n.localize("DX3rd.EnterScene")}</div></h2>
              <div class="context-box">
                ${game.i18n.localize(
                  "DX3rd.Encroachment"
                )}: ${before} -> ${after} (+${roll.total})
              </div>
              ${rollData}
          `;

          ChatMessage.create(
            {
              speaker: ChatMessage.getSpeaker({ actor: actor }),
              content: content + `</div>`,
              type: CONST.CHAT_MESSAGE_TYPES.ROLL,
              sound: CONFIG.sounds.dice,
              roll: roll,
            },
            { rollMode }
          );
        },
      },
    },
  });

  enterDialog.render(true);
});

Hooks.on("createActiveEffect", async (effect, options, userId) => {
  let actor = effect.parent;  // 상태이상이 적용된 액터
  let condition = effect.data.flags?.dx3rd?.statusId;

  // 상태이상의 label이 "DX3rd.Berserk"인 경우에만 처리
  if (condition === "berserk") {
    // 상태이상을 생성한 유저에 해당하는지 확인
    if (actor && game.user.id === userId) {
      let options = [
        { value: "normal", label: game.i18n.localize("DX3rd.Normal") },
        { value: "release", label: game.i18n.localize("DX3rd.UrgeRelease") },
        { value: "hunger", label: game.i18n.localize("DX3rd.UrgeHunger") },
        { value: "bloodsucking", label: game.i18n.localize("DX3rd.UrgeBloodsucking") },
        { value: "slaughter", label: game.i18n.localize("DX3rd.UrgeSlaughter") },
        { value: "destruction", label: game.i18n.localize("DX3rd.UrgeDestruction") },
        { value: "tourture", label: game.i18n.localize("DX3rd.UrgeTourture") },
        { value: "distaste", label: game.i18n.localize("DX3rd.UrgeDistaste") },
        { value: "battlelust", label: game.i18n.localize("DX3rd.UrgeBattlelust") },
        { value: "delusion", label: game.i18n.localize("DX3rd.UrgeDelusion") },
        { value: "selfmutilation", label: game.i18n.localize("DX3rd.UrgeSelfmutilation") },
        { value: "fear", label: game.i18n.localize("DX3rd.UrgeFear") },
        { value: "hatred", label: game.i18n.localize("DX3rd.UrgeHatred") }
      ];

      // 옵션 생성
      let optionElements = options.map(option => `<option value="${option.value}">${option.label}</option>`).join("");

      // 다이얼로그 생성 (드롭다운을 통해 타입 선택)
      new Dialog({
        title: game.i18n.localize("DX3rd.Berserk"),
        content: `
            <style>
              #berserk-type {
                width: 100%; /* 셀렉트 박스의 너비를 100%로 설정하여 다이얼로그에 맞춤 */
              }
            </style>
            <p>Select the type:</p>
            <select id="berserk-type">
              ${optionElements}  <!-- 자바스크립트로 생성된 옵션들 삽입 -->
            </select>
            <hr>`,
        buttons: {
          ok: {
            label: "OK",
            callback: async (html) => {
              // 선택된 타입 가져오기
              const selectedType = html.find("#berserk-type").val();
              // 선택된 타입을 actor의 conditions에 업데이트
              if (selectedType === "selfmutilation") {
                const currentHP = actor.system.attributes.hp.value;
                const afterHP = Math.max(currentHP - 5, 0);

                let lostHP = currentHP - afterHP;

                await actor.update({ "system.attributes.hp.value": afterHP })
                const effect = actor.effects.find(e => e.data.flags?.dx3rd?.statusId === "berserk");

                if (effect) {
                  // 'berserk' 상태가 이미 있을 경우 제거
                  await effect.delete();
                  console.log(`Removed berserk from token: ${actor.name}`);
                }

                let content = `
                <div>
                  <strong>[${game.i18n.localize("DX3rd.Mutation")}: ${game.i18n.localize("DX3rd.UrgeSelfmutilation")}] ${game.i18n.localize("DX3rd.Apply")}</strong>: ${actor.name} (-${lostHP} HP)
                </div>
                `

                ChatMessage.create({
                  speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
                  content: content,
                  type: CONST.CHAT_MESSAGE_TYPES.IC,
                });

              } 
              
              else if (selectedType === "fear") {
                await actor.update({
                  "system.conditions.berserk.type": selectedType,  // 선택한 타입 저장
                  "system.conditions.berserk.active": true         // 상태 활성화
                });

                let content = `
                <div>
                  <strong>[${game.i18n.localize("DX3rd.Mutation")}: ${game.i18n.localize("DX3rd.UrgeFear")}] ${game.i18n.localize("DX3rd.Apply")}</strong>: ${actor.name}
                </div>
                `

                ChatMessage.create({
                  speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
                  content: content,
                  type: CONST.CHAT_MESSAGE_TYPES.IC,
                });

                const token = actor.getActiveTokens()[0] || null;

                const riger = CONFIG.statusEffects.find(e => e.id === "riger");
                if (riger) {
                  await token.toggleEffect(riger);
                }

                console.log(`Applied berserk to token: ${actor.name}`);
              } 
              
              else if (selectedType === "normal") {
                await actor.update({
                  "system.conditions.berserk.type": selectedType,  // 선택한 타입 저장
                  "system.conditions.berserk.active": true         // 상태 활성화
                });

                let content = `
                <div>
                  <strong>${game.i18n.localize("DX3rd.Berserk")} ${game.i18n.localize("DX3rd.Apply")}</strong>: ${actor.name}
                </div>
                `

                ChatMessage.create({
                  speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
                  content: content,
                  type: CONST.CHAT_MESSAGE_TYPES.IC,
                });
              }              
              else {
                let label = `${game.i18n.localize(`DX3rd.Urge${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`)}`;
                await actor.update({
                  "system.conditions.berserk.type": selectedType,  // 선택한 타입 저장
                  "system.conditions.berserk.active": true         // 상태 활성화
                });

                let content = `
                <div>
                  <strong>[${game.i18n.localize("DX3rd.Mutation")}: ${label}] ${game.i18n.localize("DX3rd.Apply")}</strong>: ${actor.name}
                </div>
                `

                ChatMessage.create({
                  speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
                  content: content,
                  type: CONST.CHAT_MESSAGE_TYPES.IC,
                });
              }
            }
          },
          cancel: {
            label: "Cancel",
            callback: async () => {
              await effect.delete();  // 상태이상 적용 취소
            }
          }
        }
      }).render(true);
    }
  }

  // 상태이상의 label이 "DX3rd.Tainted"인 경우에만 처리
  else if (condition === "tainted") {
    // 상태이상을 생성한 유저에 해당하는지 확인
    if (actor && game.user.id === userId) {
      // 다이얼로그 생성 (userId에 대응하는 사용자에게만 띄움)
      new Dialog({
        title: game.i18n.localize("DX3rd.Tainted"),
        content: `<p>Input the rank:</p><input type="text" id="tainted-value" />`,
        buttons: {
          ok: {
            label: "OK",
            callback: async (html) => {
              const inputValue = html.find("#tainted-value").val();  // 입력된 값 가져오기
              await actor.update({
                "system.conditions.tainted.value": inputValue,  // 입력값 저장
                "system.conditions.tainted.active": true        // 상태 활성화
              });

              let content = `
                <div>
                  <strong>${game.i18n.localize("DX3rd.Tainted")} ${game.i18n.localize("DX3rd.Apply")}</strong>: ${actor.name} (Rank: ${inputValue})
                </div>
                `

                ChatMessage.create({
                  speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
                  content: content,
                  type: CONST.CHAT_MESSAGE_TYPES.IC,
                });
            }
          },
          cancel: {
            label: "Cancel",
            callback: async () => {
              await effect.delete();  // 상태이상 적용 취소
            }
          }
        }
      }).render(true);
    }
  }

  // 상태이상의 label이 "DX3rd.Hatred"인 경우에만 처리
  else if (condition === "hatred") {
    // 상태이상을 생성한 유저에 해당하는지 확인
    if (actor && game.user.id === userId) {
      // 현재 토큰을 제외한 다른 토큰들의 리스트 생성
      let otherTokens = canvas.tokens.placeables.filter(token => token.actor && token.actor.id !== actor.id);
      let tokenOptions = otherTokens.map(token => `<option value="${token.actor.name}">${token.actor.name}</option>`).join("");

      // 다이얼로그 생성 (드롭다운을 통해 토큰 선택)
      new Dialog({
        title: game.i18n.localize("DX3rd.Hatred"),
        content: `
        <style>
          #hatred-target {
            width: 100%; /* 셀렉트 박스의 너비를 100%로 설정하여 다이얼로그에 맞춤 */
          }
        </style>
        <p>Select the target:</p>
        <select id="hatred-target">${tokenOptions}</select>
        <hr>`,
        buttons: {
          ok: {
            label: "OK",
            callback: async (html) => {
              // 선택된 토큰 이름 가져오기
              const selectedTokenName = html.find("#hatred-target").val();
              // 선택된 토큰의 이름을 actor의 conditions에 업데이트
              await actor.update({
                "system.conditions.hatred.target": selectedTokenName,  // 선택한 토큰 이름 저장
                "system.conditions.hatred.active": true                // 상태 활성화
              });
              let content = `
              <div>
                <strong>${game.i18n.localize("DX3rd.Hatred")} ${game.i18n.localize("DX3rd.Apply")}</strong>: ${actor.name}<br>(${game.i18n.localize("DX3rd.Target")}: ${selectedTokenName})
              </div>
              `

              ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
                content: content,
                type: CONST.CHAT_MESSAGE_TYPES.IC,
              });
            }
          },
          cancel: {
            label: "Cancel",
            callback: async () => {
              await effect.delete();  // 상태이상 적용 취소
            }
          }
        }
      }).render(true);
    }
  }

  // 상태이상의 label이 "DX3rd.Fear"인 경우에만 처리
  else if (condition === "fear") {
    // 상태이상을 생성한 유저에 해당하는지 확인
    if (actor && game.user.id === userId) {
      // 현재 토큰을 제외한 다른 토큰들의 리스트 생성
      let otherTokens = canvas.tokens.placeables.filter(token => token.actor && token.actor.id !== actor.id);
      let tokenOptions = otherTokens.map(token => `<option value="${token.actor.name}">${token.actor.name}</option>`).join("");

      // 다이얼로그 생성 (드롭다운을 통해 토큰 선택)
      new Dialog({
        title: game.i18n.localize("DX3rd.Fear"),
        content: `
        <style>
          #fear-target {
            width: 100%; /* 셀렉트 박스의 너비를 100%로 설정하여 다이얼로그에 맞춤 */
          }
        </style>
        <p>Select the target:</p>
        <select id="fear-target">${tokenOptions}</select>
        <hr>`,
        buttons: {
          ok: {
            label: "OK",
            callback: async (html) => {
              // 선택된 토큰 이름 가져오기
              const selectedTokenName = html.find("#fear-target").val();
              // 선택된 토큰의 이름을 actor의 conditions에 업데이트
              await actor.update({
                "system.conditions.fear.target": selectedTokenName,  // 선택한 토큰 이름 저장
                "system.conditions.fear.active": true                // 상태 활성화
              });
              let content = `
              <div>
                <strong>${game.i18n.localize("DX3rd.Fear")} ${game.i18n.localize("DX3rd.Apply")}</strong>: ${actor.name}<br>(${game.i18n.localize("DX3rd.Target")}: ${selectedTokenName})
              </div>
              `

              ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
                content: content,
                type: CONST.CHAT_MESSAGE_TYPES.IC,
              });
            }
          },
          cancel: {
            label: "Cancel",
            callback: async () => {
              await effect.delete();  // 상태이상 적용 취소
            }
          }
        }
      }).render(true);
    }
  }

  // 나머지 상태이상 처리
  else {
    await actor.update({
      [`system.conditions.${condition}.active`]: true
    });
    let label = `${game.i18n.localize(`DX3rd.${condition.charAt(0).toUpperCase() + condition.slice(1)}`)}`;

    let content = `
    <div>
      <strong>${label} ${game.i18n.localize("DX3rd.Apply")}</strong>: ${actor.name}
    </div>
    `

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
    });
  }
});

Hooks.on("deleteActiveEffect", async (effect) => {
  let actor = effect.parent;  // 상태이상이 해제된 액터
  let condition = effect.data.flags?.dx3rd?.statusId; // 상태이상 확인

  // 상태이상의 label이 "DX3rd.Berserk"인 경우에만 처리
  if (condition === "berserk") {
    // 상태 해제 시 값을 null로 설정
    await actor.update({
      "system.conditions.berserk.active": false,
      "system.conditions.berserk.type": "-"
    });

    const effect = actor.effects.find(e => e.data.flags?.dx3rd?.statusId === condition);
    if (effect) {
      await effect.delete();
    }

    let content = `
    <div>
      <strong>${game.i18n.localize("DX3rd.Berserk")} ${game.i18n.localize("DX3rd.Clear")}</strong>: ${actor.name}
    </div>
    `

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
    });
  }

  // 상태이상의 label이 "DX3rd.Tainted"인 경우에만 처리
  else if (condition === "tainted") {
    // 상태 해제 시 값을 null로 설정
    await actor.update({
      "system.conditions.tainted.active": false,
      "system.conditions.tainted.value": null
    });

    const effect = actor.effects.find(e => e.data.flags?.dx3rd?.statusId === condition);
    if (effect) {
      await effect.delete();
    }
  }

  // 상태이상의 label이 "DX3rd.Hatred"인 경우에만 처리
  else if (condition === "hatred") {
    // 상태 해제 시 값을 null로 설정
    await actor.update({
      "system.conditions.hatred.active": false,
      "system.conditions.hatred.target": null
    });

    const effect = actor.effects.find(e => e.data.flags?.dx3rd?.statusId === condition);
    if (effect) {
      await effect.delete();
    }

    let content = `
    <div>
      <strong>${game.i18n.localize("DX3rd.Hatred")} ${game.i18n.localize("DX3rd.Clear")}</strong>: ${actor.name}
    </div>
    `

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
    });
  }

  // 상태이상의 label이 "DX3rd.Fear"인 경우에만 처리
  else if (condition === "fear") {
    // 상태 해제 시 값을 null로 설정
    await actor.update({
      "system.conditions.fear.active": false,
      "system.conditions.fear.target": null
    });

    const effect = actor.effects.find(e => e.data.flags?.dx3rd?.statusId === condition);
    if (effect) {
      await effect.delete();
    }

    let content = `
    <div>
      <strong>${game.i18n.localize("DX3rd.Fear")} ${game.i18n.localize("DX3rd.Clear")}</strong>: ${actor.name}
    </div>
    `

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
    });
  }

  // 나머지 상태이상 처리
  else {
    await actor.update({
      [`system.conditions.${condition}.active`]: false
    });

    const effect = actor.effects.find(e => e.data.flags?.dx3rd?.statusId === condition);
    if (effect) {
      await effect.delete();
    }

    let label = `${game.i18n.localize(`DX3rd.${condition.charAt(0).toUpperCase() + condition.slice(1)}`)}`;

    let content = `
    <div>
      <strong>${label} ${game.i18n.localize("DX3rd.Clear")}</strong>: ${actor.name}
    </div>
    `

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
    });
  }
});