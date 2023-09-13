// cannister code goes here
import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt } from 'azle';
import { v4 as uuidv4 , validate as isValidUUID} from 'uuid';

const DEFAULT_STORE_TYPE = "E-Commerce";

type Store = Record<{
    id: string;
    title: string;
    type: string;
    codeCount: number;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type StorePayload = Record<{
    title: string;
    type: string;
}>

type DiscountCode = Record<{
    id: string;
    storeId: string;
    value: string;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type DiscountCodePayload = Record<{
    value: string;
}>

const storeStorage = new StableBTreeMap<string, Store>(0, 44, 1024);
const discountStorage = new StableBTreeMap<string, DiscountCode>(1, 44, 1024);

// ========================= Store Management ===================================
$query;
export function getStores(): Result<Vec<Store>, string> {
    return Result.Ok(storeStorage.values());
}

$query;
export function getStore(id: string): Result<Store, string> {
  if (!isValidUUID(id)) {
    return Result.Err<Store, string>("Please enter valid Store ID!");
  }

  return match(storeStorage.get(id), {
    Some: (storeData) => Result.Ok<Store, string>(storeData),
    None: () => Result.Err<Store, string>(`Store with given id=${id} not found!`),
  });
}


$update;
export function addStore(payload: StorePayload): Result<Store, string> {
  if (!payload.title) {
    return Result.Err(
      "The Store title is required! Please enter valid data.",
    );
  }

  const stores = storeStorage.values();
  const isStoreExists = stores.find((store) => store.title === payload.title);

  if (isStoreExists) {
    return Result.Err<Store, string>(
      "A Store with the same title already exists!",
    );
  }

  if (
    !payload.type ||
    (payload.type && typeof payload.type !== "string")
  ) {
    payload.type = DEFAULT_STORE_TYPE;
  }

  const store: Store = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    codeCount: 0,
    ...payload,
    type: payload.type ?? DEFAULT_STORE_TYPE,
  };

  storeStorage.insert(store.id, store);

  return Result.Ok<Store, string>(store);
}

$update;
export function updateStore(
  id: string,
  payload: StorePayload,
): Result<Store, string> {
  if (!isValidUUID(id)) {
    return Result.Err<Store, string>("Please enter valid Store ID!");
  }

  if (!payload.title) {
    return Result.Err(
      "The Store title is required! Please enter valid data.",
    );
  }


  return match(storeStorage.get(id), {
    Some: (store) => {
      const updatedStore: Store = {
        ...store,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };

      storeStorage.insert(store.id, updatedStore);

      return Result.Ok<Store, string>(updatedStore);
    },
    None: () =>
      Result.Err<Store, string>(
        `Could not update a store with the given id=${id}. Store not found!`,
      ),
  });
}

$update;
export function deleteStore(id: string): Result<Store, string> {
  if (!isValidUUID(id)) {
    return Result.Err<Store, string>("Please enter valid Store ID!");
  }
  // Attempt to delete all discount codes from the store first
  try {
    // Initialize an array to store the IDs of discount codes to be deleted
  const discountCodesToDelete: string[] = [];

  // Iterate through discountStorage to identify discount codes associated with the store
  discountStorage.values().forEach((discountCode) => {
    if (discountCode.storeId === id) {
      discountCodesToDelete.push(discountCode.id);
    }
  });
  if (discountCodesToDelete.length !=0) {
        // Remove all identified discount codes
        discountCodesToDelete.forEach((discountCodeId) => {
        discountStorage.remove(discountCodeId);
  });
  }
 
  } catch {
    return Result.Err<Store, string>("An error occurred - cannot delete discount code(s) associated with this store");
  }
  

  return match(storeStorage.remove(id), {
    Some: (deletedStore) => Result.Ok<Store, string>(deletedStore),
    None: () =>
      Result.Err<Store, string>(
        `Could not delete a Store with the given id=${id}. Store not found!`,
      ),
  });
}



// ========================= Discount Code Management ===================================
$query;
export function getStoreDiscountCodes(
  storeId: string,
): Result<Vec<DiscountCode>, string> {
  if (!isValidUUID(storeId)) {
    return Result.Err("Please enter valid Store ID!");
  }
  const store = getStore(storeId);
  if (!store.Ok || store.Err) {
    return Result.Err("Store not found!");
  }

  return Result.Ok(
    discountStorage.values().filter(({ storeId }) => storeId === storeId),
  );
}

$update;
export function addStoreDiscountCode(
  storeId: string,
  payload: DiscountCodePayload,
): Result<DiscountCode, string> {
  if (!isValidUUID(storeId)) {
    return Result.Err("Please enter valid Store ID!");
  }

  const store = getStore(storeId);
  

  if (!store.Ok || store.Err) {
    return Result.Err<DiscountCode, string>(
      "Could not find the Store with the given ID!",
    );
  }
  const storeData = store.Ok;

  const discountCode: DiscountCode = {
    id: uuidv4(),
    storeId,
    createdAt: ic.time(),
    updatedAt: Opt.Some(ic.time()),
    ...payload,
  };

  discountStorage.insert(discountCode.id, discountCode);
  // Update the store's codeCount
  const updatedStore: Store = {
    ...storeData,
    codeCount: storeData.codeCount + 1,
    updatedAt: Opt.Some(ic.time()),
  };

  // Insert the updated store back into storage
  storeStorage.insert(storeId, updatedStore);
  return Result.Ok(discountCode);
}


$update;
export function deleteDiscount(id: string): Result<DiscountCode, string> {
  if (!isValidUUID(id)) {
    return Result.Err<DiscountCode, string>("Please enter valid Discount Code ID!");
  }
  const discountData = discountStorage.get(id);
  const storeId = discountData.Some?.storeId;
  if (storeId) {
    const store = getStore(storeId);
    const storeData = store.Ok;
    if (storeData){
        const updatedStore: Store = {
            ...storeData,
            codeCount: storeData.codeCount - 1,
            updatedAt: Opt.Some(ic.time()),
          };
          storeStorage.insert(storeId, updatedStore);
    }
   
  }
  return match(discountStorage.remove(id), {
    Some: (deletedDiscount) => Result.Ok<DiscountCode, string>(deletedDiscount),
    None: () =>
      Result.Err<DiscountCode, string>(
        `Could not delete discount code with the given id=${id}. Discount code not found!`,
      ),
  });
}


// a workaround to make uuid package work with Azle
globalThis.crypto = {
    // @ts-ignore
   getRandomValues: () => {
       let array = new Uint8Array(32);

       for (let i = 0; i < array.length; i++) {
           array[i] = Math.floor(Math.random() * 256);
       }

       return array;
   }
};