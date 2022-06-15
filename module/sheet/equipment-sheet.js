import { DX3rdWorksSheet } from "./works-sheet.js";

export class DX3rdEquipmentSheet extends DX3rdWorksSheet {

  /** @override */
  async getData(options) {
    let data = await super.getData(options);

    let skills = data.data.skills;
    let actorSkills = data.data.actorSkills;

    for (const [key, value] of Object.entries(skills)) {
      if (key in actorSkills)
        continue;

      if (value.apply)
        actorSkills[key] = value;
    }

    return data;
  }

}