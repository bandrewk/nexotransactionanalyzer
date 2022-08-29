import classes from "./index.module.css";

import { useState, DragEvent } from "react";
import { X } from "phosphor-react";
import { useAppDispatch } from "../../hooks";
import {
  addTransaction,
  TransactionType,
} from "../../reducers/transactionReducer";

type FileUploadProps = {
  callback: (success: boolean) => void;
};

const FileUpload = ({ callback }: FileUploadProps) => {
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

      console.log(
        "Warning: Fixing transactions of type REPAYMENT and LIQUIDATION while importing. This could leave small balances of FIAT in your portfolio."
      );

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

        const fixFiatX = (cur: string) => {
          if (cur === "EURX") cur = "EUR";
          if (cur === "GBPX") cur = "GBP";
          if (cur === "USDX") cur = "USD";
          return cur;
        };

        // Fix repayments
        // Repayments are positive in the csv instead of negative.
        if (transaction.Type === TransactionType.REPAYMENT) {
          // Lets protect us from this firing back, if nexo decides to fix their csv one day..
          if (parseFloat(transaction["Input Amount"]) > 0)
            transaction["Input Amount"] = (-transaction[
              "Input Amount"
            ]).toString();
        }

        // Fix liquidations
        // There`s no way around this. This will fire back some day.
        // We also get rounding errors from this, as the USD Eq. is only 2 decimals instead of 8
        if (transaction.Type === TransactionType.LIQUIDATION) {
          transaction["Output Currency"] = "USD";
          transaction["Output Amount"] =
            transaction["USD Equivalent"].substring(1);
        }

        // Headers:
        // ['Transaction', 'Type', 'Input Currency', 'Input Amount', 'Output Currency', 'Output Amount', 'USD Equivalent', 'Details', 'Outstanding Loan', 'Date / Time']

        dispatch(
          addTransaction({
            id: transaction.Transaction,
            type: transaction.Type,
            inputCurrency: fixFiatX(transaction["Input Currency"]),
            inputAmount: parseFloat(transaction["Input Amount"]),
            outputCurrency: fixFiatX(transaction["Output Currency"]),
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

      callback(true);
    } catch (error) {
      callback(false);
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
            {/* <button className="btn--primary subheading">Start</button> */}
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
