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
  }); // spell-sheet 등록
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

Hooks.on("setActorEncroach", (actor, key, encroach) => {
  game.DX3rd.itemUsage[key] = {
    actor: actor,
    encroach: encroach,
    target: false,
    roll: false,
  };
});

Hooks.on("updateActorEncroach", async (actor, key, type) => {
  let itemUsage = game.DX3rd.itemUsage[key];
  itemUsage[type] = true;
  if (itemUsage.target && itemUsage.roll) {
    const last = Number(actor.system.attributes.encroachment.value);
    let encroach = last + itemUsage.encroach;

    let chatData = {
      speaker: ChatMessage.getSpeaker({ actor: actor }),
    }

    if (Number.isNumeric(itemUsage.encroach))
      chatData.content = `<div class="context-box">${actor.name}: ${last} -> ${encroach} (+${itemUsage.encroach})</div>`;
    else {
      let roll = new Roll(itemUsage.encroach);
      await roll.roll({ async: true });
  
      let rollData = await roll.render();
  
      encroach = last + roll.total;
      chatData.content = `
        <div class="dx3rd-roll" data-actor-id=${actor.id}>
          <h2 class="header"><div class="title">${actor.name}: ${last} -> ${encroach} (+${roll.total})</div></h2>
          ${rollData}
        </div>
      `;
      chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
      chatData.sound = CONFIG.sounds.dice;
      chatData.roll = roll;
    }
  
    await actor.update({ "system.attributes.encroachment.value": encroach });
    let rollMode = game.settings.get("core", "rollMode");
    ChatMessage.create(chatData, { rollMode });
  }
});






Hooks.on("setActorHP", (actor, key, hpCost) => {
  game.DX3rd.itemUsage[key] = {
    actor: actor,
    hpCost: hpCost,
    target: false,
    roll: false,
  };
});

Hooks.on("updateActorHP", async (actor, key, type) => {
  let itemUsage = game.DX3rd.itemUsage[key];
  itemUsage[type] = true;

  const lastHP = Number(actor.system.attributes.hp.value);
  let newHP = lastHP - itemUsage.hpCost;  // encroach 대신 hpCost 사용

  let chatData = {
    speaker: ChatMessage.getSpeaker({ actor: actor }),
  };

  // HP 소모량이 숫자인 경우
  if (Number.isNumeric(itemUsage.hpCost)) {
    chatData.content = `<div class="context-box">${actor.name}: ${lastHP} -> ${newHP} (-${itemUsage.hpCost})</div>`;
  } else {
    // 주사위 굴림을 통해 HP 소모량 계산
    let roll = new Roll(itemUsage.hpCost);
    await roll.roll({ async: true });

    let rollData = await roll.render();
    newHP = lastHP - roll.total;
    chatData.content = `
      <div class="dx3rd-roll" data-actor-id=${actor.id}>
        <h2 class="header"><div class="title">${actor.name}: ${lastHP} -> ${newHP} (-${roll.total})</div></h2>
        ${rollData}
      </div>
    `;
    chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
    chatData.sound = CONFIG.sounds.dice;
    chatData.roll = roll;
  }

  // HP 값 업데이트
  await actor.update({ "system.attributes.hp.value": newHP });
  let rollMode = game.settings.get("core", "rollMode");
  ChatMessage.create(chatData, { rollMode });
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




  html.on("click", ".use-effect", async (ev) => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

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

    Hooks.call("setActorEncroach", actor, item.id, encroach);

    usingEffect(item);
    runningMacro(item.system.macro, actor, item);
    for (let target of targets.map((t) => t.actor))
      await item.applyTarget(target);

    Hooks.call("updateActorEncroach", actor, item.id, "target");
    
    if (rollType === "-")
      Hooks.call("updateActorEncroach", actor, item.id, "roll");
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
  });

  html.on("click", ".use-combo", async (ev) => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

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

    // 효과와 매크로 실행
    for (let e of effectItems) {
      if (e === "-") continue;

      let effect = actor.items.get(e);
      if (effect.system.effect.disable !== "-") appliedList.push(effect);

      for (let target of targets.map((t) => t.actor))
        await effect.applyTarget(target);
      
      if (effect.system.macro !== "")
        await runningMacro(effect.system.macro);

      await usingEffect(effect);
    }

    Hooks.call("setActorEncroach", actor, item.id, encroach);
    
    await usingEffect(item);
    await runningMacro(item.system.macro, actor, item);

    Hooks.call("updateActorEncroach", actor, item.id, "target");

    if (rollType === "-")
      Hooks.call("updateActorEncroach", actor, item.id, "roll");
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

    if (item.system.getTarget) {
      let targets = Array.from(game.user.targets || []);
      if (targets.length > 0) {
        targeting(targets, actor);

      } else {
        ui.notifications.info(`${game.i18n.localize("DX3rd.SelectTarget")}`);
        return;
      }
    }

    Hooks.call("setActorEncroach", actor, item.id, encroach);

    usingEffect(item);
    runningMacro(item.system.macro, actor, item);
    for (let target of targets.map((t) => t.actor))
      await item.applyTarget(target);

    Hooks.call("updateActorEncroach", actor, item.id, "target");
    
    if (rollType === "-") {
      runningMacro(item.system.macro, actor, item);
      Hooks.call("updateActorEncroach", actor, item.id, "roll");
    } else {
      const diceOptions = {
        key: item.id,
        rollType: rollType,
        spelltype: spellType,
        invoke: invoke,
        evocation: evocation,
        macro: macroName,
      };

      await actor._onSpellRoll(diceOptions);
      Hooks.call("updateActorEncroach", actor, item.id, "roll"); // 침식률 업데이트
    }

  });

  html.on("click", ".roll-attack", async (ev) => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

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
  });

  html.on("click", ".calc-damage", async (ev) => {
    ev.preventDefault();
    const data = ev.currentTarget.dataset;
    const attack = Number(data.attack);
    const damage = Number(data.damage);
    const rollResult = Number(
      $(ev.currentTarget).parent().find(".dice-total").first().text()
    );

    new Dialog({
      title: game.i18n.localize("DX3rd.CalcDamage"),
      content: `
            <h2 style="text-align: center;">[${rollResult} / 10 + 1 + ${damage}]D10 + ${attack}</h2>

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
        `,
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
              parseInt((rollResult + addResult) / 10) + 1 + damage + addDice
            }d10 + ${attack + addDamage}`;

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
