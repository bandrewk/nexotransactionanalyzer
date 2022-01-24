import { Navigator, AppState } from "/js/navigator.js";

class App {
  // Page elements
  #m_eDropZone;
  #m_file;

  #m_cNavigator;

  constructor() {
    this.#Initiaize();
  }

  /**
   * Initialization code
   */
  #Initiaize() {
    // Start particle system in header
    this.#StartParticleSystem();
    this.#ParseDocument();

    this.#m_cNavigator = new Navigator();
  }

  /**
   * Parse document for needed handles
   */
  #ParseDocument() {
    let bFailed = false;

    this.#m_eDropZone = document.querySelector(".home-dropzone");

    if (this.#m_eDropZone) {
      this.#m_eDropZone.addEventListener("drop", this.DropHandler.bind(this));
      this.#m_eDropZone.addEventListener("dragover", this.DragOver);
    } else bFailed = true;

    if (bFailed) {
      console.log(
        "Failed parsing document: Unable to catch all handles. Please verify that the script is loaded as module and the HTML is intact."
      );
    }
  }

  /////////////////////////////////////////////////////
  /// File Handling
  /////////////////////////////////////////////////////

  /**
   * This is needed otherwise the `drop` event won't fire
   * @param {event} e
   */
  DragOver(e) {
    // Prevent default behavior
    e.preventDefault();
  }

  /**
   * Handle the drop event
   * @param {event} e
   */
  DropHandler(e) {
    // Prevent default behavior and bubbling
    e.preventDefault();
    e.stopImmediatePropagation();

    // We only accept one dropped item of type FILE
    if (e.dataTransfer.items) {
      if (e.dataTransfer.items[0].kind === "file") {
        this.#m_file = e.dataTransfer.items[0].getAsFile();

        console.log(`Reading file ${this.#m_file.name}..`);

        // Process content
        // prettier-ignore
        //this.#m_File.text().then((content) => this.FileReady(content));
      }
    }
  }

  /////////////////////////////////////////////////////
  /// ETC
  /////////////////////////////////////////////////////
  /**
   * Starts the header background animation particle system
   */
  #StartParticleSystem() {
    tsParticles
      .loadJSON("tsparticles", "/js/header.json")
      .then((container) => {
        //console.log("callback - tsparticles config loaded");
      })
      .catch((error) => {
        console.error(error);
      });
  }
}

// Let's go =)
let app = new App();
