// Constant of reducer names for the localStorage
export const STATE = {
  TRANSACTIONS: `transactions`,
};

export const CHECKDATA = `HasDataSaved`;

export const loadState = (item: string, defaultState: any) => {
  try {
    // 1. Try to load data
    const serializedState = localStorage.getItem(item);

    // 2. Is there any data?
    if (serializedState === null) {
      //   console.log(`No data saved for`, item);
      return defaultState;
    }

    // 3. Return data
    return JSON.parse(serializedState);
  } catch (err) {
    console.log(`loadState`, JSON.stringify(err));
    return defaultState;
  }
};

export const saveState = (item: string, state: any) => {
  try {
    // 1. Save data
    const serializedState = JSON.stringify(state);
    localStorage.setItem(item, serializedState);
    // console.log(`saved`, item);
  } catch (err) {
    console.log(`saveState `, JSON.stringify(err));
  }
};
