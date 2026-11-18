import pandas as pd


def hug():
    # Tester to read in Huggin face file
    df = pd.read_json("hf://datasets/diddmstjr/confusable-100-lipreading/merged_metadata.json")

    # Iterate through contents
    return df


def main():
    df = hug()

    print("Total recordings in dataset:", len(df))

    print("\nColumns:")
    print(df.columns.tolist())

    print("\nFirst 5 recordings:")
    print(df.head())

    print("\nMissing values:")
    print(df.isnull().sum())

if __name__ == "__main__":
    main()