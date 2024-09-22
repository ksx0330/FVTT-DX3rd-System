export class DX3rdRegisterHelpers {
  static init() {
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifIn', function(arg1, arg2, options) {
      return (arg1[arg2]) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('skill', function(arg) {
      return (arg != null && arg.indexOf('DX3rd.') != -1) ? game.i18n.localize(arg) : arg;
    });

    Handlebars.registerHelper('skillByKey', function(actor, key) {
      if (key == "-" || actor == null)
        return key;

      if (!(key in actor.system.attributes.skills))
        return "<" + game.i18n.localize("DX3rd." + key[0].toUpperCase() + key.slice(1)) + ">";

      let name = actor.system.attributes.skills[key].name;
      return (name.indexOf('DX3rd.') != -1) ? "<" + game.i18n.localize(name) + ">" : "<" + name + ">";
    });

    Handlebars.registerHelper('timing', function(arg) {
      if (arg == "" || arg == "-") return;

      let split = arg.split("-");
      let retList = [];

      for (let s of split) {
        let ss = s[0].toUpperCase() + s.slice(1);
        retList.push(game.i18n.localize(`DX3rd.${ss}`));
      }

      return retList.join(" / ");
    });

    Handlebars.registerHelper('spelltype', function(arg) {
      if (arg == "" || arg == "-") return;

      let split = arg.split("-");
      let retList = [];

      for (let s of split) {
        let ss = s[0].toUpperCase() + s.slice(1);
        retList.push(game.i18n.localize(`DX3rd.${ss}`));
      }

      return retList.join(" / ");
    });

    Handlebars.registerHelper('attrSkill', function(actor, item, key, idx) {
      if (key == '-')
        return;

      if (actor != null && key in actor)
        return Handlebars.compile('{{skill arg}}')({arg: actor[key][idx]});

      if (key in item)
        return Handlebars.compile('{{skill arg}}')({arg: item[key][idx]});
    });

    Handlebars.registerHelper('effectById', function(actor, id) {
      if (actor == null)
        return;

      console.log(actor.items.get(id));
      if (id in actor.items)
        return actor.items.get(id);
    });


    Handlebars.registerHelper('disable', function(arg) {
      const list = {"notCheck": "DX3rd.NotCheck", "roll": "DX3rd.AfterRoll", "major": "DX3rd.AfterMajor", "reaction": "DX3rd.AfterReaction", "round": "DX3rd.AfterRound", "battle": "DX3rd.AfterScene"};
      return game.i18n.localize(list[arg]);
    });

    Handlebars.registerHelper('encroach', function(arg) {
      if (arg <= 100)
        return `background: linear-gradient(90deg, black ${arg}%, lightslategray 0%);`;
      else if (arg <= 200)
        return `background: linear-gradient(90deg, #7e0018 ${arg - 100}%, black 0%);`;
      else
        return `background: linear-gradient(90deg, darkcyan ${arg - 200}%, #7e0018 0%);`;
    });

    Handlebars.registerHelper('usedMax', function(used, level) {
      return used.max + (used.level ? level : 0);
    });

    Handlebars.registerHelper('usedFull', function(used, level, options) {
      let max = used.max + (used.level ? level : 0);
      return (used.disable != 'notCheck' && used.state >= max) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('usedFullForCombo', function(actor, combo, options) {
      console.log(actor);
      console.log(combo);

      const effectItems = combo.system.effect;
      for (let e of effectItems) {
        if (e == "-")
          continue;
  
        let effect = actor.items.find(element => element._id == e);
        let used = effect.system.used;
  
        if (used.disable != 'notCheck') {
          let max = used.max + (used.level ? effect.system.level.value : 0);
          if (used.state >= max) {
            return options.fn(this);
          }
        }
      }
      return options.inverse(this);

    });
  }
}
