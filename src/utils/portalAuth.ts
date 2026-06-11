/**
 * Utility to fetch the logged-in portal user's email from Firebase IndexedDB
 */
export function getPortalUserEmail(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        resolve(null);
        return;
      }

      const request = window.indexedDB.open("firebaseLocalStorageDb");

      request.onerror = () => {
        resolve(null);
      };

      request.onsuccess = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
          db.close();
          resolve(null);
          return;
        }

        try {
          const transaction = db.transaction(["firebaseLocalStorage"], "readonly");
          const objectStore = transaction.objectStore("firebaseLocalStorage");
          const getAllRequest = objectStore.getAll();

          getAllRequest.onsuccess = () => {
            const results = getAllRequest.result;
            db.close();

            if (Array.isArray(results)) {
              for (const item of results) {
                let userObj = item;
                if (item && item.value) {
                  userObj = item.value;
                }

                if (typeof userObj === "string") {
                  try {
                    userObj = JSON.parse(userObj);
                  } catch (e) {
                    continue;
                  }
                }

                if (userObj && userObj.email) {
                  resolve(userObj.email);
                  return;
                }
              }
            }
            resolve(null);
          };

          getAllRequest.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch (e) {
          db.close();
          resolve(null);
        }
      };
    } catch (error) {
      resolve(null);
    }
  });
}
