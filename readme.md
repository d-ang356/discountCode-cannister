Setup

    Install dfx using DFX_VERSION=0.14.1 sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"
    Add it to your PATH variables using echo 'export PATH="$PATH:$HOME/bin"' >> "$HOME/.bashrc"
    Next, run dfx start --background
    Then run dfx deploy. It will take a while
    A link will be generated. Go to that link and test all the functions

Methods

    1. getStores -> Returns all stores;
    2. getStore -> Returns a specific store (store id required);
    3. addStore -> Creates a new store;
    4. updateStore -> Updates a store (store id required);
    5. deleteStore -> Deletes a store and all of its discount codes (if any) (store id required);
    6. getStoreDiscountCodes -> Returns all discount codes for a store (store id required);
    7. addStoreDiscountCode -> Adds a discount code for a store (store id required);
    8. deleteDiscount -> Deletes discount code (discount code id required);