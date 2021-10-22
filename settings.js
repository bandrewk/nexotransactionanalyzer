`use strict`;

/////////////////////////////////////////////////////
/// Statistics helper class
/////////////////////////////////////////////////////
export const SettingsType = {
  PRETTYNUMBERS: 0,
  SHOWICONS: 1,
  LINKTRANSACTIONS: 2,
  MAXIMUM: 3,
};

export class Settings {
  #m_eSettingsBox;
  #m_bSettings;

  constructor() {
    //this.#QueryDocument();
  }

  // Returns the desired setting
  GetSetting(type) {
    return true; //this.#m_bSettings[type];
  }

  // Catch all elements
  #QueryDocument() {
    this.#m_bSettings = [];
    this.#m_eSettingsBox = [];

    for (let i = 0; i < SettingsType.MAXIMUM; i++) {
      this.#m_eSettingsBox[i] = document.querySelector(`#settingsbox-${i + 1}`); // + 1 because in html we start with 1 instead of 0
      this.#m_eSettingsBox[i].addEventListener(
        "click",
        this.ButtonClicked.bind(this)
      );
      this.#m_bSettings.push(true);
    }
  }

  // Button logic
  ButtonClicked(e) {
    const parent = e.target.closest(`div`);
    let h2 = parent.querySelector(`h2`);
    let hr = parent.querySelectorAll(`hr`);

    if (parent === null || h2 === null || hr === null)
      throw new Error(
        `Settings: Button clicked but one or more childs are null!`
      );

    switch (e.target.closest(`div`)) {
      /////////////////////////////////////////////////////
      /// Pretty Numbers
      /////////////////////////////////////////////////////
      case this.#m_eSettingsBox[SettingsType.PRETTYNUMBERS]: {
        // Switch on/off
        if (this.#m_bSettings[SettingsType.PRETTYNUMBERS]) {
          // deactivate
          h2.innerText = `❌ Pretty numbers`;
        } else {
          // activate
          h2.innerText = `✅ Pretty numbers`;
        }

        this.#m_bSettings[SettingsType.PRETTYNUMBERS] =
          !this.#m_bSettings[SettingsType.PRETTYNUMBERS];

        this.#SwitchHrStyle(hr);
        break;
      }
      /////////////////////////////////////////////////////
      /// Show icons
      /////////////////////////////////////////////////////
      case this.#m_eSettingsBox[SettingsType.SHOWICONS]: {
        // Switch on/off
        if (this.#m_bSettings[SettingsType.SHOWICONS]) {
          // deactivate
          h2.innerText = `❌ Show icons`;
        } else {
          // activate
          h2.innerText = `✅ Show icons`;
        }

        this.#m_bSettings[SettingsType.SHOWICONS] =
          !this.#m_bSettings[SettingsType.SHOWICONS];

        this.#SwitchHrStyle(hr);
        break;
      }
      /////////////////////////////////////////////////////
      /// Link transactions
      /////////////////////////////////////////////////////
      case this.#m_eSettingsBox[SettingsType.LINKTRANSACTIONS]: {
        // Switch on/off
        if (this.#m_bSettings[SettingsType.LINKTRANSACTIONS]) {
          // deactivate
          h2.innerText = `❌ Link transactions`;
        } else {
          // activate
          h2.innerText = `✅ Link transactions`;
        }

        this.#m_bSettings[SettingsType.LINKTRANSACTIONS] =
          !this.#m_bSettings[SettingsType.LINKTRANSACTIONS];

        this.#SwitchHrStyle(hr);
        break;
      }
    }
  }

  #SwitchHrStyle(e) {
    e.forEach((e) => {
      e.classList.toggle(`settings-separator-active`);
    });
  }
}
