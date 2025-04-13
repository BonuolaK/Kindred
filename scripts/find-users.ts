import { storage } from "../server/storage";

async function findUsers() {
  try {
    console.log("Searching for specific users in the database:");
    
    try {
      const tester = await storage.getUserByUsername("Tester");
      console.log("Tester:", tester ? {
        id: tester.id,
        username: tester.username,
        gender: tester.gender,
        interestedGenders: tester.interestedGenders
      } : "Not found");
    } catch (error) {
      console.error("Error finding Tester:", error);
    }
    
    try {
      const bonuolak = await storage.getUserByUsername("BonuolaK");
      console.log("BonuolaK:", bonuolak ? {
        id: bonuolak.id,
        username: bonuolak.username,
        gender: bonuolak.gender,
        interestedGenders: bonuolak.interestedGenders
      } : "Not found");
    } catch (error) {
      console.error("Error finding BonuolaK:", error);
    }
    
    try {
      const tester99 = await storage.getUserByUsername("Tester99");
      console.log("Tester99:", tester99 ? {
        id: tester99.id,
        username: tester99.username,
        gender: tester99.gender,
        interestedGenders: tester99.interestedGenders
      } : "Not found");
    } catch (error) {
      console.error("Error finding Tester99:", error);
    }
    
    // Try to list all users in the database
    console.log("\nAttempting to list all users by ID:");
    for (let id = 1; id <= 20; id++) {
      try {
        const user = await storage.getUser(id);
        if (user) {
          console.log(`User ID ${id}:`, {
            username: user.username,
            gender: user.gender,
            interestedGenders: user.interestedGenders
          });
        }
      } catch (error) {
        // Skip errors for non-existent users
      }
    }
  } catch (error) {
    console.error("Error in findUsers:", error);
  }
}

findUsers();