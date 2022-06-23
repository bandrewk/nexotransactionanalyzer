import classes from "./FileUpload.module.css";

import { useState, DragEvent } from "react";

const FileUpload = () => {
  const [file, setFile] = useState<File | null>();
  const [highlightArea, setHighlightArea] = useState<boolean>(false);
  const [fileSelected, setFileSelected] = useState<boolean>(false);

  /* Load file via button */
  const OnFileChangeHandler = (event: React.ChangeEvent) => {
    const target = event.target as HTMLInputElement;
    const uploadedFile: File = (target.files as FileList)[0];

    if (uploadedFile) {
      if (uploadedFile.name.includes(".csv")) {
        console.log("File is of type csv!");

        console.log(uploadedFile.name);

        setFile(uploadedFile);
        setFileSelected(true);
      } else {
        // Error, file is wrong type
      }
    } else {
      // Error, file is null
    }
  };

  /* Load file via drag'n'drop */
  const OnDropHandler = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e.dataTransfer.items) {
      if (e.dataTransfer.items[0].kind === "file") {
        const uploadedFile = e.dataTransfer.items[0].getAsFile();

        if (uploadedFile?.name.includes(".csv")) {
          console.log("File is of type csv!");

          console.log(uploadedFile?.name);
          console.log(uploadedFile);

          setFile(e.dataTransfer.items[0].getAsFile());

          setFileSelected(true);
        } else {
          // Error
        }
      }
    }

    setHighlightArea(false);
  };

  const OnDragOverHandler = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (highlightArea) return;
    setHighlightArea(true);
  };

  const OnDragEnterHandler = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (highlightArea) return;
    setHighlightArea(true);
  };

  const OnDragLeaveHandler = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!highlightArea) return;
    setHighlightArea(false);
  };

  if (fileSelected) {
    return (
      <>
        <section className="section-upload">
          <div
            className={`${classes["content-upload-area"]} ${classes.loaded}`}
          >
            <label>
              Loaded file <span>{file?.name}</span>
            </label>
            <button className="btn--primary subheading">Start</button>
          </div>
        </section>
      </>
    );
  }

  const uploadAreaClasses = `${classes["content-upload-area"]}  ${
    highlightArea && classes["drag-Active"]
  }`;

  return (
    <>
      <section className="section-upload">
        <p className="subheading">Upload</p>
        <div
          className={uploadAreaClasses}
          onDrop={OnDropHandler}
          onDragOver={OnDragOverHandler}
          onDragEnter={OnDragEnterHandler}
          onDragLeave={OnDragLeaveHandler}
        >
          <p>Drop your transactions CSV here or</p>

          <label
            htmlFor="fileInput"
            className={`btn--primary subheading ${classes.fileUpload}`}
          >
            <input
              id="fileInput"
              type="file"
              onChange={OnFileChangeHandler}
              accept=".csv"
            />
            Choose File
          </label>
        </div>
      </section>
    </>
  );
};

export default FileUpload;
