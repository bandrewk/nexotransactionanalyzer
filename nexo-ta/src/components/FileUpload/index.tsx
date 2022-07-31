import classes from "./index.module.css";

import { useState, DragEvent } from "react";
import { X } from "phosphor-react";
import { useAppDispatch } from "../../hooks";
import { addTransaction } from "../../reducers/transactionReducer";

const FileUpload = () => {
  const [file, setFile] = useState<File | null>();
  const [highlightArea, setHighlightArea] = useState<boolean>(false);
  const [fileSelected, setFileSelected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // const transactions = useAppSelector((state) => state.transactions);
  const dispatch = useAppDispatch();

  const processFile = (content: String) => {
    try {
      const data = content.split("\n");
      const headers = data[0].split(",");

      // Check headers
      if (headers.length !== 10) {
        throw new Error(`Headers mismatch. Expected 10, got ${headers.length}`);
      }

      // Go through data line by line
      // Y → → → X (EOL)
      // ↓ → → → X
      // ↓ → → → X
      // (EOF)
      for (let y = 1; y < data.length - 1; y++) {
        let rowData = data[y].split(",");

        // Construct a single transaction
        type TransactionImport = {
          [key: string]: string;
        };

        let transaction: TransactionImport = {};

        // Grab all data
        for (let x = 0; x < rowData.length; x++) {
          transaction[headers[x].trim()] = rowData[x].trim();
        }

        // Empty line check
        if (transaction.Transaction === "") break;

        // ['Transaction', 'Type', 'Input Currency', 'Input Amount', 'Output Currency', 'Output Amount', 'USD Equivalent', 'Details', 'Outstanding Loan', 'Date / Time']
        dispatch(
          addTransaction({
            id: transaction.Transaction,
            type: transaction.Type,
            inputCurrency: transaction["Input Currency"],
            inputAmount: parseFloat(transaction["Input Amount"]),
            outputCurrency: transaction["Output Currency"],
            outputAmount: parseFloat(transaction["Output Amount"]),
            usdEquivalent: parseFloat(
              transaction["USD Equivalent"].substring(1)
            ),
            details: transaction.Details,
            outstandingLoan: parseFloat(
              transaction["Outstanding Loan"].substring(1)
            ),
            dateTime: transaction["Date / Time"],
          })
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  /* Load file via button */
  const OnFileChangeHandler = (event: React.ChangeEvent) => {
    setError(null);

    const target = event.target as HTMLInputElement;
    const uploadedFile: File = (target.files as FileList)[0];

    if (uploadedFile) {
      if (uploadedFile.name.includes(".csv")) {
        setFile(uploadedFile);
        setFileSelected(true);

        uploadedFile.text().then((content) => processFile(content));
      } else {
        // Error, file is wrong type
        setError(Error("Uploaded file is of wrong type."));
      }
    } else {
      // Error, file is null

      setError(Error("File upload failed."));
    }
  };

  /* Load file via drag'n'drop */
  const OnDropHandler = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setError(null);

    if (e.dataTransfer.items) {
      if (e.dataTransfer.items[0].kind === "file") {
        const uploadedFile = e.dataTransfer.items[0].getAsFile();

        if (uploadedFile?.name.includes(".csv")) {
          setFile(e.dataTransfer.items[0].getAsFile());
          setFileSelected(true);

          uploadedFile.text().then((content) => processFile(content));
        } else {
          setError(Error("Uploaded file is of wrong type."));
        }
      } else {
        setError(Error("Uploaded file is of wrong type."));
      }
    } else {
      setError(Error("File upload failed."));
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

  /* Remove selected file */
  const OnRemoveFileHandler = () => {
    setFile(null);
    setHighlightArea(false);
    setFileSelected(false);
    setError(null);
  };

  if (fileSelected) {
    return (
      <>
        <section className="section-upload">
          <p className="subheading">Upload</p>
          <div
            className={`${classes["content-upload-area"]} ${classes.loaded}`}
          >
            <label>
              Loaded file<span>{file?.name}</span>{" "}
              <button onClick={OnRemoveFileHandler}>
                <X size={24} weight="light" color="red" />
              </button>
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
          {error && <p className={classes.errorMessage}>{error.message}</p>}
        </div>
      </section>
    </>
  );
};

export default FileUpload;
