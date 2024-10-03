
export class DX3rdCombat extends Combat {
  
  /** @inheritdoc */
  async _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (game.user.id != userId)
      return;
      
    let startActor = null, startLabel = "[ Setup ]";
    let endActor = null, endLabel = "[ Cleanup ]"
    
    let startToken = null
    let endToken = null
    
    for (let a of game.actors) {
      if (a.name == startLabel)
        startActor = a;
      else if (a.name == endLabel)
        endActor = a;
    }
  
    if (startActor == null)
      startActor = await Actor.create({name: startLabel, type: "character", img: "icons/svg/clockwork.svg"});
    if (endActor == null)
      endActor = await Actor.create({name: endLabel, type: "character", img: "icons/svg/clockwork.svg"});


    for (let a of this.scene.tokens) {
      if (a.name == startLabel)
        startToken = a;
      else if (a.name == endLabel)
        endToken = a;
    }
    
    if (startToken == null)
      startToken = (await this.scene.createEmbeddedDocuments("Token", [{alpha: 0, actorId: startActor.id}], {}))[0];
    if (endToken == null)
      endToken = (await this.scene.createEmbeddedDocuments("Token", [{alpha: 0, actorId: endActor.id}], {}))[0];


    await this.setFlag("dx3rd", "startToken", startToken.uuid);
    await this.setFlag("dx3rd", "endToken", endToken.uuid);

    await this.createEmbeddedDocuments("Combatant", [{actorId: startActor.id, tokenId: startToken.id, name: startLabel, img: startActor.img, initiative: 999}, {actorId: endActor.id, tokenId: endToken.id, name: endLabel, img: startActor.img, initiative: -999}], {});
    
    if ( !this.collection.viewed ) ui.combat.initialize({combat: this});
  }
    
  /** @Override */
  async rollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}}={}) {
    let startTokenUUID = this.flags["dx3rd"].startToken;
    let endTokenUUID = this.flags["dx3rd"].endToken;

    let startToken = await fromUuid(startTokenUUID);
    let endToken = await fromUuid(endTokenUUID);


    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant?.id;
    const rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");

    // Iterate over Combatants, performing an initiative roll for each
    const updates = [];
    const messages = [];
    for ( let [i, id] of ids.entries() ) {

      // Get Combatant data (non-strictly)
      const combatant = this.combatants.get(id);
      if ( !combatant?.isOwner ) return results;

      // Produce an initiative roll for the Combatant
      const roll = combatant.getInitiativeRoll(formula);
      await roll.evaluate({async: true});

      let init = roll.total;
      if (combatant.tokenId == startToken.id)
        init = 999
      else if (combatant.tokenId == endToken.id)
        init = -999

      updates.push({_id: id, initiative: init});
    }
    if ( !updates.length ) return this;

    // Update multiple combatants
    await this.updateEmbeddedDocuments("Combatant", updates);

    // Ensure the turn order remains with the same combatant
    if ( updateTurn && currentId ) {
      await this.update({turn: this.turns.findIndex(t => t.id === currentId)});
    }

    // Create multiple chat messages
    await ChatMessage.implementation.create(messages);
    return this;
  }

  _sortCombatants(a, b) {
    const ia = Number.isNumeric(a.initiative) ? a.initiative : -999;
    const ib = Number.isNumeric(b.initiative) ? b.initiative : -999;
    let ci = ib - ia;
    if ( ci !== 0 ) return ci;

    if (a.isNPC !== b.isNPC) {
      if (a.isNPC)
        return 1;
      else
        return -1;
    }

    let cn = a.name.localeCompare(b.name);   
    if ( cn !== 0 ) return cn;
    return a.id - b.id;
  }

  /* -------------------------------------------- */	
  
   /** @Override */
  async _onDelete(options, userId) {
    let startTokenUUID = this.flags["dx3rd"].startToken;
    let endTokenUUID = this.flags["dx3rd"].endToken;

    super._onDelete(options, userId);
    
    if (game.user.isGM) {
      let startToken = await fromUuid(startTokenUUID);
      let endToken = await fromUuid(endTokenUUID);

      await startToken.delete();
      await endToken.delete();
    }
  }

  /* -------------------------------------------- */	

  // 이니셔티브 재굴림
  async _dx3rdInitRoll() {
    for (let combatant of this.combatants) {
      if (combatant.name === "[ Setup ]") {
        await combatant.update({ initiative: 999 });
      } 
      else if (combatant.name === "[ Cleanup ]") {
        await combatant.update({ initiative: -999 });
      } 
      else if (combatant.actor.system.conditions.action_delay?.active) {
        // 행동 대기 상태일 때, 기존 이니셔티브를 유지
        const currentInitiative = combatant.initiative ?? 0;  // 현재 이니셔티브 값이 없을 경우 0으로 설정
        await combatant.update({ initiative: currentInitiative });
      } 
      else {
        // 이니셔티브 재굴림
        await combatant.rollInitiative();
      }
    }
  
    // 전투 데이터 업데이트
    await this.update({ round: this.round });
  }
  
  // 다음 턴으로 이동
  async _turnOrder() {
    let sortedTurns = this.turns.filter(turn => {
      let actor = turn.actor;
      if (!actor || !actor.system || !actor.system.conditions) {
        return false;
      }
    
      let defeated = actor.system.conditions.defeated?.active;
      let end = actor.system.conditions.action_end?.active;
      let isExceptional = actor.name === "[ Setup ]" || actor.name === "[ Cleanup ]";
    
      return !defeated && !end && !isExceptional;  // 행동 종료되지 않고, [ Setup ], [ Cleanup ]이 아닌 캐릭터만 필터링
    });

    // sortedTurns가 비어 있을 경우, 기본 턴 이동 처리
    if (sortedTurns.length === 0) {
      let cleanupTurn = this.turns.find(turn => turn.actor.name === "[ Cleanup ]");
      if (cleanupTurn) {
        let targetIndex = this.turns.findIndex((turn) => turn.id === cleanupTurn.id);
        await this.update({ turn: targetIndex, turnOrder: this.turns });
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.initiative()
    }

    // 가장 빠른 이니셔티브를 가진 캐릭터 찾기
    let targetInitiative = sortedTurns[0]?.initiative;

    if (targetInitiative !== undefined) {
      // 가장 높은 이니셔티브를 가진 캐릭터들
      let highestInitiativeTurns = sortedTurns.filter(
        (turn) => turn.initiative === targetInitiative
      );

      // 현재 턴이 아닌 캐릭터 선택 (this.combatant 대신 this.turn 사용)
      let targetTurn = highestInitiativeTurns.find(
        (turn) => turn.id !== this.turn.id
      );

      if (!targetTurn) {
        // 만약 선택된 캐릭터가 없을 경우 가장 첫번째 캐릭터 선택
        targetTurn = highestInitiativeTurns[0];
      }

      // 선택된 캐릭터의 턴으로 이동
      let targetIndex = this.turns.findIndex((turn) => turn.id === targetTurn.id);
      await this.update({ turn: targetIndex, turnOrder: this.turns });

      console.log(`${game.i18n.localize("DX3rd.InitiativeCharacter")}: ${targetTurn.actor.name}`);

      this.initiative()
    }
  }  

  async startCombat() {
    // 먼저 모든 컴배턴트의 이니셔티브를 굴림
    await this._dx3rdInitRoll();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 이후 전투 시작을 진행
    super.startCombat();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await this.countRounds()
  }

  async nextTurn() {
    const combatant = this.turns[this.turn];

    if (combatant.name === "[ Setup ]" || combatant.name === "[ Cleanup ]") {
      // [setup] 또는 [cleanup]일 경우 바로 다음 턴으로 이동
      super.nextTurn();
      if (combatant.name === "[ Setup ]") {
        await new Promise((resolve) => setTimeout(resolve, 50));
        this.initiative()
      }
    } else if (combatant.actor.system.conditions.action_delay?.active) {
      let thisCombatant = combatant;
      let actor = thisCombatant.actor

      let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        content: `${game.i18n.localize("DX3rd.ActionEnd")}: ${actor.name}`
      };
      ChatMessage.create(chatData);

      // 행동 종료 상태 업데이트
      await actor.update({
        "system.conditions.action_end.active": true
      });
      await this.main_close_trigger()
      await this._dx3rdInitRoll(); // 이니셔티브 재굴림
      await new Promise((resolve) => setTimeout(resolve, 50));
      this._turnOrder(); // 다음 턴으로 이동
    } else {
      // 다이얼로그 생성
      new Dialog({
        title: "Turn End",
        content: `
        <p>${combatant.name}</p>
      `,
        buttons: {
          endAction: {
            label: game.i18n.localize("DX3rd.ActionEnd"),
            callback: async () => {
              let thisCombatant = combatant;
              let actor = thisCombatant.actor

              let chatData = {
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor: actor }),
                content: `${game.i18n.localize("DX3rd.ActionEnd")}: ${actor.name}`
              };
              ChatMessage.create(chatData);

              // 행동 종료 상태 업데이트
              await actor.update({
                "system.conditions.action_end.active": true
              });
              await this.main_close_trigger()
              await this._dx3rdInitRoll(); // 이니셔티브 재굴림
              await new Promise((resolve) => setTimeout(resolve, 50));
              this._turnOrder(); // 다음 턴으로 이동
            },
          },
          delayAction: {
            label: game.i18n.localize("DX3rd.ActionDelay"),
            callback: async () => {

              let thisCombatant = combatant;
              let actor = thisCombatant.actor;

              let chatData = {
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor: actor }),
                content: `${game.i18n.localize("DX3rd.ActionDelay")}: ${actor.name}`
              };
              ChatMessage.create(chatData);

              // 행동 대기 상태 업데이트
              await actor.update({
                "system.conditions.action_delay.active": true
              });
          
              // 전투에 참여 중인 모든 액터들 중에서 액션 딜레이가 활성화된 액터 수 확인
              let delayCount = this.combatants.filter(c => {
                let actor = c.actor;
                // 액터와 액터의 상태 확인
                if (!actor || !actor.system || !actor.system.conditions) {
                  return false;
                }
                return actor.system.conditions.action_delay?.active;
              }).length;
          
              // 현재 전투원의 이니셔티브를 -N으로 업데이트
              await thisCombatant.update({
                initiative: -delayCount
              });
              await this.main_close_trigger()
              // 이니셔티브 재굴림 및 턴 순서 정렬
              await this._dx3rdInitRoll();
              await new Promise((resolve) => setTimeout(resolve, 50));
              this._turnOrder(); // 다음 턴으로 이동
            },
          }
        },
        default: "endAction"
      }).render(true);
    }
  }

  async initiative() {
    let initCharacter = this.combatant.name === "[ Cleanup ]" ? game.i18n.localize("DX3rd.Null") : this.combatant.name;

    let content = `
    <div class="dx3rd-roll">
      <h2 class="header"><div class="title width-100">
        ${game.i18n.localize("DX3rd.Initiative")} ${game.i18n.localize("DX3rd.Process")}
      </div></h2><hr>
      <div class="context-box">
        ${game.i18n.localize("DX3rd.InitiativeCharacter")}: ${initCharacter}
      </div>
    </div>
  `

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "GM" }),
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
    });

    setTimeout(() => {
      if (this.combatant.name === "[ Cleanup ]") {
        this.startCleanupDialog();  // 클린업 프로세스 실행
      } else if (this.combatant.name === "[ Setup ]") {
        ui.notificationsinfo(`setup process`)
      } else {
        this.startMainDialog();  // 메일 프로세스 실행
      }
    }, 2000); // 2초 정도의 텀을 두고 다이얼로그 호출
  }

  async startMainDialog() {
    let content = `
    <div>${game.i18n.localize("DX3rd.InitiativeCharacter")}: ${this.combatant.name}</div><hr>
    <div style="display: flex; flex-direction: column;">
      <button class="macro-button" data-action="1">${game.i18n.localize("DX3rd.MainStart")}</button>
      <button class="macro-button" data-action="2">${game.i18n.localize("DX3rd.ReCheck")}</button>
    </div>
  `;
    let startMainDialog = new Dialog({
      title: `${game.i18n.localize("DX3rd.Main")} ${game.i18n.localize("DX3rd.Process")}`,
      content: content,
      buttons: {},
      close: () => { },
      render: html => {
        html.find(".macro-button").click(ev => {
          let action = parseInt(ev.currentTarget.dataset.action);
          switch (action) {
            case 1:
              let message = `
              <div class="dx3rd-roll">
                <h2 class="header"><div class="title width-100">
                  ${game.i18n.localize("DX3rd.Main")} ${game.i18n.localize("DX3rd.Process")}
                </div></h2><hr>
                <div class="context-box">
                  ${game.i18n.localize("DX3rd.MainCharacter")}: ${this.combatant.name}
                </div>
              </div>
            `
              ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ alias: "GM" }),
                content: message,
                type: CONST.CHAT_MESSAGE_TYPES.IC,
              });
              break;
            case 2:
              this._dx3rdInitRoll(); // 이니셔티브 재굴림
              new Promise((resolve) => setTimeout(resolve, 50));
              this._turnOrder(); // 다음 턴으로 이동
              break;
            default:
              break;
          }
          startMainDialog.close();
        });
      }
    });
    startMainDialog.render(true);
  }

  async startCleanupDialog() {
    let content = `
    <div style="display: flex; flex-direction: column;">
      <button class="macro-button" data-action="1">${game.i18n.localize("DX3rd.CleanupStart")}</button>
      <button class="macro-button" data-action="2">${game.i18n.localize("DX3rd.ReCheck")}</button>
    </div>
  `;
    let startCleanupDialog = new Dialog({
      title: `${game.i18n.localize("DX3rd.Cleanup")} ${game.i18n.localize("DX3rd.Process")}`,
      content: content,
      buttons: {},
      close: () => { },
      render: html => {
        html.find(".macro-button").click(ev => {
          let action = parseInt(ev.currentTarget.dataset.action);
          switch (action) {
            case 1:
              let message = `
              <div class="dx3rd-roll">
                <h2 class="header"><div class="title width-100">
                  ${game.i18n.localize("DX3rd.Cleanup")} ${game.i18n.localize("DX3rd.Process")}
                </div></h2><hr>
              </div>
            `
              ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ alias: "GM" }),
                content: message,
                type: CONST.CHAT_MESSAGE_TYPES.IC,
              });
              this.cleanup_trigger();
              break;
            case 2:
              this._dx3rdInitRoll(); // 이니셔티브 재굴림
              new Promise((resolve) => setTimeout(resolve, 50));
              this._turnOrder(); // 다음 턴으로 이동
              break;
            default:
              break;
          }
          startCleanupDialog.close();
        });
      }
    });
    startCleanupDialog.render(true);
  }

  async previousTurn() {
    super.previousTurn();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await this._dx3rdInitRoll(); // 이니셔티브 재굴림
    await new Promise((resolve) => setTimeout(resolve, 50));
    this._turnOrder(); // 다음 턴으로 이동
  }

  async countRounds() {
    let currentRound = this.round;  // 현재 라운드를 가져옴

    let startContent = ``;
    if (currentRound === 1) {
      startContent = `
      <h2 class="header"><div class="title width-100">
        ${game.i18n.localize("DX3rd.CombatStart")}
      </div></h2><hr>
    `;
    }

    let content = `
    <div class="dx3rd-roll">
      ${startContent}
      <h2 class="header"><div class="title width-100">
        ${game.i18n.localize("DX3rd.Round")} ${currentRound}
      </div></h2><hr>
      <h2 class="header"><div class="title width-100">
        ${game.i18n.localize("DX3rd.Setup")} ${game.i18n.localize("DX3rd.Process")}
      </div></h2><hr>
    </div>
  `

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "GM" }),  // 여기서 GM으로 설정
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    await this.setup_trigger();
  }

  //라운드 종료 시 기능//
  async nextRound() {
    // 모든 컴배턴트의 액션 종료와 대기 상태를 초기화
    for (let combatant of this.combatants) {
      await combatant.actor.update({
        "system.conditions.action_end.active": false,
        "system.conditions.action_delay.active": false
      });
    }

    // 기본 라운드 이동 처리 호출
    super.nextRound();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await this.countRounds();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await this._dx3rdInitRoll();
  }

  //전투 종료 시 기능//
  async endCombat() {
    // 모든 컴배턴트를 반복하면서 행동 종료와 대기 상태를 초기화
    for (let combatant of this.combatants) {
      await combatant.actor.update({
        "system.conditions.action_end.active": false,
        "system.conditions.action_delay.active": false
      });
    }

    let content = `
    <div class="dx3rd-roll">
      <h2 class="header"><div class="title width-100">
        ${game.i18n.localize("DX3rd.CombatEnd")}
      </div></h2><hr>
    </div>
  `

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "GM" }),  // 여기서 GM으로 설정
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
    });

    // 기본 전투 종료 처리 호출
    super.endCombat();
  }

  /* -------------------------------------------- */	

  // 셋업 프로세스 시 동작하는 효과들을 일괄적으로 처리하기 위한 기능 //
  async setup_trigger() {
    await this._trigger_macros_setup();
  }

  // 메인 프로세스 종료 시 동작하는 효과들을 일괄적으로 처리하기 위한 기능 //
  async main_close_trigger() {
    await this._lostHP();
  }

  // 클린업 프로세스 시 동작하는 효과들을 일괄적으로 처리하기 위한 기능 //
  async cleanup_trigger() {
    await this._dazed_off();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await this._taintedDamage();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await this._healingHP();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await this._trigger_macros_cleanup()
  }

  /* -------------------------------------------- */	

  // 셋업 시 "trigger_setup_"으로 시작하는 매크로를 호출 //
  async _trigger_macros_setup() {
    // 모든 매크로를 가져옴
    const macros = game.macros;

    // "trigger_setup_"으로 시작하는 매크로 필터링
    const cleanupMacros = macros.filter(macro => macro.name.startsWith("trigger_setup_"));

    // 매크로 실행
    for (let macro of cleanupMacros) {
      await macro.execute();
    }
  }

  // 메인 프로세스 종료 시 HP 상실 효과 자동화 //
  async _lostHP() {
    let messages = []; // 메시지를 저장할 배열

    for (let combatant of this.combatants) {
      let actor = combatant.actor;

      // lostHP 상태가 활성화되어 있는지 확인
      if (actor.system.conditions.lostHP?.active && !actor.system.conditions.defeated?.active) {
        let lostValue = Number(actor.system.conditions.lostHP?.value || 0);

        // 현재 HP에서 lostHP 값을 빼기
        let currentHP = actor.system.attributes.hp.value;
        let afterHP = Math.max(currentHP - lostValue, 0);

        let lostHP = currentHP - afterHP;

        // 새로운 HP 값을 업데이트 (HP가 0 이하로 떨어지지 않도록 최소값을 0으로 설정)
        await actor.update({ "system.attributes.hp.value": afterHP });

        // HP를 잃었다는 메시지를 messages 배열에 저장
        messages.push(`
        <div>
          <strong>${game.i18n.localize("DX3rd.LostHP")}</strong>: ${actor.name} (-${lostHP} HP)
        </div>
      `);

        // lostHP 상태를 해제 (일회성으로 처리할 경우)
        await actor.update({
          "system.conditions.lostHP.active": false,
          "system.conditions.lostHP.value": null
        });
      }
    }

    // 메시지 통합 후 한번에 출력
    if (messages.length > 0) {
      let messageContent = `
      <div>
        ${messages.join("<hr>")}  <!-- 각 컴배턴트의 메시지들을 구분선으로 묶어서 출력 -->
      </div>
    `;

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
        content: messageContent,
        type: CONST.CHAT_MESSAGE_TYPES.IC,
      });
    }
  }

  // 클린업 시 사독 데미지 효과 자동화 //
  async _taintedDamage() {
    let messages = []; // 메시지를 저장할 배열

    for (let combatant of this.combatants) {
      let actor = combatant.actor;

      // lostHP 상태가 활성화되어 있는지 확인
      if (actor.system.conditions.tainted?.active && !actor.system.conditions.defeated?.active) {
        let taintedValue = (Number(actor.system.conditions.tainted?.value || 0) * 3);

        // 현재 HP에서 lostHP 값을 빼기
        let currentHP = actor.system.attributes.hp.value;
        let afterHP = Math.max(currentHP - taintedValue, 0);

        let lostHP = currentHP - afterHP;

        // 새로운 HP 값을 업데이트 (HP가 0 이하로 떨어지지 않도록 최소값을 0으로 설정)
        await actor.update({ "system.attributes.hp.value": afterHP });

        // HP를 잃었다는 메시지를 messages 배열에 저장
        messages.push(`
          <div>
            <strong>${game.i18n.localize("DX3rd.TaintedDamage")}</strong>: ${actor.name} (-${lostHP} HP)
          </div>
        `);
      }
    }

    // 메시지 통합 후 한번에 출력
    if (messages.length > 0) {
      let messageContent = `
        <div>
          ${messages.join("<hr>")}  <!-- 각 컴배턴트의 메시지들을 구분선으로 묶어서 출력 -->
        </div>
      `;

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
        content: messageContent,
        type: CONST.CHAT_MESSAGE_TYPES.IC,
      });
    }
  }

  // 클린업 시 힐링 회복 효과 자동화 //
  async _healingHP() {
    let messages = []; // 메시지를 저장할 배열

    for (let combatant of this.combatants) {
      let actor = combatant.actor;

      // lostHP 상태가 활성화되어 있는지 확인
      if (actor.system.conditions.healing?.active && !actor.system.conditions.defeated?.active) {
        let healingValue = Number(actor.system.conditions.healing?.value || 0);

        // 현재 HP에서 lostHP 값을 빼기
        let currentHP = actor.system.attributes.hp.value;
        let maxHP = actor.system.attributes.hp.max;
        let afterHP = Math.min(currentHP + healingValue, maxHP);

        let getHP = afterHP - currentHP;

        // 새로운 HP 값을 업데이트 (HP가 0 이하로 떨어지지 않도록 최소값을 0으로 설정)
        await actor.update({ "system.attributes.hp.value": afterHP });

        // HP를 잃었다는 메시지를 messages 배열에 저장
        messages.push(`
            <div>
              <strong>${game.i18n.localize("DX3rd.Healing")}</strong>: ${actor.name} (+${getHP} HP)
            </div>
          `);
      }
    }

    // 메시지 통합 후 한번에 출력
    if (messages.length > 0) {
      let messageContent = `
          <div>
            ${messages.join("<hr>")}  <!-- 각 컴배턴트의 메시지들을 구분선으로 묶어서 출력 -->
          </div>
        `;

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ alias: "GM" }), // GM으로 설정
        content: messageContent,
        type: CONST.CHAT_MESSAGE_TYPES.IC,
      });
    }
  }

  // 클린업 시 방심 회복 효과 자동화 //
  async _dazed_off() {
    for (let combatant of this.combatants) {
      let actor = combatant.actor;
      let condition = actor.effects.find(e => e.data.flags?.dx3rd?.statusId === "dazed");
      if (condition) {
        await condition.delete();
      }
    }
  }

  // 클린업 시 "trigger_cleanup_"으로 시작하는 매크로를 호출 //
  async _trigger_macros_cleanup() {
    // 모든 매크로를 가져옴
    const macros = game.macros;

    // "trigger_cleanup_"으로 시작하는 매크로 필터링
    const cleanupMacros = macros.filter(macro => macro.name.startsWith("trigger_cleanup_"));

    // 매크로 실행
    for (let macro of cleanupMacros) {
      await macro.execute();
    }
  }
}


