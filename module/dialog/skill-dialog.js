
export class DX3rdSkillDialog extends Dialog {
  constructor(actor, skillId, options) {
    super(options);

    this.actor = actor;
    this.key = skillId;
    let buttons = {}

    if (this.key != null) {
      this.option = "edit";
      this.skill = actor.data.data.attributes.skills[skillId];
      this.skill.key = skillId;
    } else {
      this.option = "create";
      this.skill = {
        key: "",
        name: "",
        point: "",
        base: "",
        delete: true
      }

      buttons = {
        create: {
          label: "Create",
          callback: () => this._skillCreate()

        }
      }
    }

    this.data = {
      title: options.title,
      content: "",
      buttons: buttons
    };

  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/dx3rd/templates/dialog/skill-dialog.html",
      classes: ["dx3rd", "dialog"],
      width: 500
    });
  }


  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".skill-change").change(this._skillChange.bind(this));
    html.find(".skill-delete").click(this._skillDelete.bind(this));
  }

  /** @override */
  getData() {
    return {
      title: this.data.title,
      content: this.data.content,
      buttons: this.data.buttons,
      skill: this.skill,
      delete: (this.option == "create") ? false : this.skill.delete,
      option: this.option 
    }
  }

  async _skillChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const type = input.dataset.type;
    const val = $(input).val();

    if (this.option == "create")
      return;

    if (type == "base" && !this.skill.delete)
      return;

    await this.actor.update({[`data.attributes.skills.${this.key}.${type}`]: Number(val)});
    if (type == "point") {
      let add = this.actor.data.data.attributes.skills[this.key].value;
      $("#skill-value").val("+" + add);
    }
  }

  async _skillDelete(event) {
    if (this.option == "create")
      return;

    if (!this.skill.delete)
      return;

    Dialog.confirm({
      title: "Delete?",
      content: "",
      yes: async () => {
        await this.actor.update({[`data.attributes.skills.-=${this.key}`]: null});
        this.close();
      },
      no: () => console.log("Canceled"),
      defaultYes: false
    });
  }

  async _skillCreate(event) {
    this.key = $("#skill-key").val();
    this.skill.name = $("#skill-name").val();
    this.skill.point = $("#skill-point").val();
    this.skill.base = $("#skill-base").val();

    await this.actor.update({[`data.attributes.skills.${this.key}`]: this.skill});
    this.close();
  }


}