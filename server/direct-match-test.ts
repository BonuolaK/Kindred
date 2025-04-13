import { storage } from "./storage";
import { User } from "@shared/schema";
import { MatchingAlgorithm } from "./matching-algorithm";

/**
 * This is a direct test function that bypasses the database
 * to check why Tester99 isn't matching with Tester
 */
export async function testDirectMatch() {
  try {
    // Create mock user objects matching our schema
    const tester99: User = {
      id: 19,
      username: "Tester99",
      name: "Tester 99",
      email: "tester99@example.com",
      password: "password", // Not used for this test
      gender: "Woman",
      interestedGenders: ["Men"],
      age: 30,
      location: "New York, NY",
      bio: "Test user",
      createdAt: new Date(),
      avatar: "🧑‍💻",
      onboardingCompleted: true,
      photoUrl: null,
      idVerificationImage: null,
      communicationStyle: "Direct",
      dealbreakers: ["Smoking"],
      freeTimeActivities: ["Reading", "Hiking"],
      loveLanguage: "Quality Time",
      values: "Honesty",
      conflictResolution: "Talk it out",
      relationshipPace: "Medium",
      profileType: "free",
      idVerified: false,
      idVerificationSkipped: false,
      isPhotoRevealed: false,
      isPremium: false,
      dateOfBirth: null,
      agePreferenceMin: null,
      agePreferenceMax: null,
      questionnaireStep: null
    };
    
    const tester: User = {
      id: 2,
      username: "Tester",
      name: "Tester",
      email: "tester@example.com",
      password: "password", // Not used for this test
      gender: "male",
      interestedGenders: ["female"],
      age: 32,
      location: "New York, NY",
      bio: "Original test user",
      createdAt: new Date(),
      avatar: "👨",
      onboardingCompleted: true,
      photoUrl: null,
      idVerificationImage: null,
      communicationStyle: "Direct",
      dealbreakers: ["Smoking"],
      freeTimeActivities: ["Reading", "Travel"],
      loveLanguage: "Quality Time",
      values: "Honesty",
      conflictResolution: "Talk it out",
      relationshipPace: "Medium",
      profileType: "basic",
      idVerified: false,
      idVerificationSkipped: false,
      isPhotoRevealed: false,
      isPremium: false,
      dateOfBirth: null,
      agePreferenceMin: null,
      agePreferenceMax: null,
      questionnaireStep: null
    };
    
    // Run the algorithm directly
    console.log("=== DIRECT MATCH TEST ===");
    console.log("Testing match between:");
    console.log(`- Tester99: ${JSON.stringify({
      id: tester99.id,
      gender: tester99.gender,
      interestedGenders: tester99.interestedGenders
    })}`);
    console.log(`- Tester: ${JSON.stringify({
      id: tester.id,
      gender: tester.gender,
      interestedGenders: tester.interestedGenders
    })}`);
    
    const algorithm = new MatchingAlgorithm();
    
    // Test both directions
    console.log("\nTesting Tester99 -> Tester:");
    const result1 = algorithm.findMatches(tester99, [tester]);
    console.log(`Match result: ${JSON.stringify(result1)}`);
    
    console.log("\nTesting Tester -> Tester99:");
    const result2 = algorithm.findMatches(tester, [tester99]);
    console.log(`Match result: ${JSON.stringify(result2)}`);
    
    // Try with real database users
    console.log("\n=== DATABASE USERS TEST ===");
    const dbTester99 = await storage.getUserByUsername("Tester99");
    const dbTester = await storage.getUserByUsername("Tester");
    
    if (dbTester99 && dbTester) {
      console.log("Found both users in database");
      console.log(`- Tester99: ${JSON.stringify({
        id: dbTester99.id,
        gender: dbTester99.gender,
        interestedGenders: dbTester99.interestedGenders
      })}`);
      console.log(`- Tester: ${JSON.stringify({
        id: dbTester.id,
        gender: dbTester.gender,
        interestedGenders: dbTester.interestedGenders
      })}`);
      
      console.log("\nTesting Tester99 -> Tester with DB users:");
      const dbResult1 = algorithm.findMatches(dbTester99, [dbTester]);
      console.log(`Match result: ${JSON.stringify(dbResult1)}`);
      
      console.log("\nTesting Tester -> Tester99 with DB users:");
      const dbResult2 = algorithm.findMatches(dbTester, [dbTester99]);
      console.log(`Match result: ${JSON.stringify(dbResult2)}`);
    } else {
      console.log("Could not find one or both users in database");
      console.log(`- Tester99 found: ${!!dbTester99}`);
      console.log(`- Tester found: ${!!dbTester}`);
    }
    
  } catch (error) {
    console.error("Error in direct match test:", error);
  }
}