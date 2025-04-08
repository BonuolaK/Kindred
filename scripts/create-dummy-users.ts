import { db } from '../server/db';
import { matches, users } from '../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { ukCities } from '../client/src/lib/uk-cities';
import { eq, or, and } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createDummyUsers() {
  console.log('Creating dummy users...');
  
  // Define sample user data
  const dummyUsers = [
    {
      username: 'sarah_m',
      password: await hashPassword('password123'),
      email: 'sarah@example.com',
      name: 'Sarah Mitchell',
      age: 28,
      gender: 'female',
      interestedGenders: ['male'],
      location: ukCities[Math.floor(Math.random() * ukCities.length)],
      bio: 'Art lover, coffee enthusiast, and hiking enthusiast. Looking for someone to share adventures with.',
      photoUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
      communicationStyle: 'I prefer open and honest communication about feelings.',
      freeTimeActivities: ['hiking', 'painting', 'reading'],
      values: 'Honesty, kindness, and a sense of adventure',
      conflictResolution: 'I believe in addressing issues calmly and finding solutions together.',
      loveLanguage: 'quality time',
      relationshipPace: 'moderate',
      dealbreakers: ['smoking', 'dishonesty'],
      isPhotoRevealed: false,
      isPremium: false,
      onboardingCompleted: true,
      questionnaireStep: 10
    },
    {
      username: 'james_t',
      password: await hashPassword('password123'),
      email: 'james@example.com',
      name: 'James Taylor',
      age: 32,
      gender: 'male',
      interestedGenders: ['female'],
      location: ukCities[Math.floor(Math.random() * ukCities.length)],
      bio: 'Software developer by day, musician by night. Looking for someone to share my passion for music and technology.',
      photoUrl: 'https://randomuser.me/api/portraits/men/2.jpg',
      communicationStyle: 'I like to discuss problems as they arise rather than letting them build up.',
      freeTimeActivities: ['coding', 'playing guitar', 'concerts'],
      values: 'Creativity, ambition, and authenticity',
      conflictResolution: 'I believe in finding compromises that work for both people.',
      loveLanguage: 'acts of service',
      relationshipPace: 'slow',
      dealbreakers: ['rudeness', 'lack of ambition'],
      isPhotoRevealed: false,
      isPremium: false,
      onboardingCompleted: true,
      questionnaireStep: 10
    },
    {
      username: 'olivia_w',
      password: await hashPassword('password123'),
      email: 'olivia@example.com',
      name: 'Olivia Wang',
      age: 26,
      gender: 'female',
      interestedGenders: ['male', 'female'],
      location: ukCities[Math.floor(Math.random() * ukCities.length)],
      bio: 'Foodie, traveler, and book lover. Looking for someone who enjoys trying new restaurants and exploring different cultures.',
      photoUrl: 'https://randomuser.me/api/portraits/women/3.jpg',
      communicationStyle: 'I value direct but kind communication.',
      freeTimeActivities: ['cooking', 'traveling', 'reading'],
      values: 'Openness, curiosity, and empathy',
      conflictResolution: 'I like to take time to process and then discuss issues calmly.',
      loveLanguage: 'words of affirmation',
      relationshipPace: 'moderate',
      dealbreakers: ['close-mindedness', 'lack of empathy'],
      isPhotoRevealed: false,
      isPremium: false,
      onboardingCompleted: true,
      questionnaireStep: 10
    },
    {
      username: 'michael_j',
      password: await hashPassword('password123'),
      email: 'michael@example.com',
      name: 'Michael Johnson',
      age: 34,
      gender: 'male',
      interestedGenders: ['female'],
      location: ukCities[Math.floor(Math.random() * ukCities.length)],
      bio: 'Fitness enthusiast, dog lover, and outdoor adventurer. Looking for someone to share an active lifestyle with.',
      photoUrl: 'https://randomuser.me/api/portraits/men/4.jpg',
      communicationStyle: 'I prefer to talk things through and find solutions together.',
      freeTimeActivities: ['gym', 'hiking', 'dog walking'],
      values: 'Health, loyalty, and growth',
      conflictResolution: 'I believe in addressing issues head-on and working through them together.',
      loveLanguage: 'physical touch',
      relationshipPace: 'moderate',
      dealbreakers: ['sedentary lifestyle', 'disliking pets'],
      isPhotoRevealed: false,
      isPremium: false,
      onboardingCompleted: true,
      questionnaireStep: 10
    },
    {
      username: 'emma_l',
      password: await hashPassword('password123'),
      email: 'emma@example.com',
      name: 'Emma Lee',
      age: 29,
      gender: 'female',
      interestedGenders: ['male'],
      location: ukCities[Math.floor(Math.random() * ukCities.length)],
      bio: 'Teacher, yoga enthusiast, and amateur photographer. Looking for someone to share peaceful moments and creative pursuits.',
      photoUrl: 'https://randomuser.me/api/portraits/women/5.jpg',
      communicationStyle: 'I believe in gentle, mindful communication.',
      freeTimeActivities: ['yoga', 'photography', 'meditation'],
      values: 'Mindfulness, compassion, and growth',
      conflictResolution: 'I prefer to take time to reflect and then communicate my feelings calmly.',
      loveLanguage: 'quality time',
      relationshipPace: 'slow',
      dealbreakers: ['aggression', 'excessive materialism'],
      isPhotoRevealed: false,
      isPremium: false,
      onboardingCompleted: true,
      questionnaireStep: 10
    },
    {
      username: 'david_h',
      password: await hashPassword('password123'),
      email: 'david@example.com',
      name: 'David Hernandez',
      age: 31,
      gender: 'male',
      interestedGenders: ['female'],
      location: ukCities[Math.floor(Math.random() * ukCities.length)],
      bio: 'Chef, film buff, and soccer fan. Looking for someone to cook for, watch movies with, and support my team.',
      photoUrl: 'https://randomuser.me/api/portraits/men/6.jpg',
      communicationStyle: 'I value honesty and directness in communication.',
      freeTimeActivities: ['cooking', 'watching films', 'playing soccer'],
      values: 'Passion, loyalty, and enjoyment of life',
      conflictResolution: 'I believe in addressing issues directly and finding solutions quickly.',
      loveLanguage: 'acts of service',
      relationshipPace: 'moderate',
      dealbreakers: ['dishonesty', 'lack of passion'],
      isPhotoRevealed: false,
      isPremium: false,
      onboardingCompleted: true,
      questionnaireStep: 10
    },
    {
      username: 'mia_p',
      password: await hashPassword('password123'),
      email: 'mia@example.com',
      name: 'Mia Patel',
      age: 27,
      gender: 'female',
      interestedGenders: ['male', 'female'],
      location: ukCities[Math.floor(Math.random() * ukCities.length)],
      bio: 'Doctor, book lover, and amateur pianist. Looking for someone who values intellectual conversations and quiet nights in.',
      photoUrl: 'https://randomuser.me/api/portraits/women/7.jpg',
      communicationStyle: 'I prefer thoughtful, in-depth conversations about feelings and issues.',
      freeTimeActivities: ['reading', 'playing piano', 'medical research'],
      values: 'Intelligence, compassion, and personal growth',
      conflictResolution: 'I believe in understanding the root cause of issues and addressing them thoughtfully.',
      loveLanguage: 'words of affirmation',
      relationshipPace: 'slow',
      dealbreakers: ['anti-intellectualism', 'lack of empathy'],
      isPhotoRevealed: false,
      isPremium: false,
      onboardingCompleted: true,
      questionnaireStep: 10
    },
    {
      username: 'ethan_c',
      password: await hashPassword('password123'),
      email: 'ethan@example.com',
      name: 'Ethan Chen',
      age: 30,
      gender: 'male',
      interestedGenders: ['female'],
      location: ukCities[Math.floor(Math.random() * ukCities.length)],
      bio: 'Entrepreneur, rock climber, and podcast enthusiast. Looking for someone who enjoys adventures and deep conversations.',
      photoUrl: 'https://randomuser.me/api/portraits/men/8.jpg',
      communicationStyle: 'I value open, honest communication about all aspects of life.',
      freeTimeActivities: ['rock climbing', 'listening to podcasts', 'entrepreneurship'],
      values: 'Growth, adventure, and authenticity',
      conflictResolution: 'I believe in facing challenges head-on and growing through them.',
      loveLanguage: 'quality time',
      relationshipPace: 'moderate',
      dealbreakers: ['close-mindedness', 'fear of change'],
      isPhotoRevealed: false,
      isPremium: false,
      onboardingCompleted: true,
      questionnaireStep: 10
    },
    {
      username: 'sophia_r',
      password: await hashPassword('password123'),
      email: 'sophia@example.com',
      name: 'Sophia Rodriguez',
      age: 25,
      gender: 'female',
      interestedGenders: ['male'],
      location: ukCities[Math.floor(Math.random() * ukCities.length)],
      bio: 'Dancer, painter, and nature lover. Looking for someone who appreciates art and outdoor adventures.',
      photoUrl: 'https://randomuser.me/api/portraits/women/9.jpg',
      communicationStyle: 'I express my feelings through art and words.',
      freeTimeActivities: ['dancing', 'painting', 'hiking'],
      values: 'Creativity, freedom, and connection to nature',
      conflictResolution: 'I believe in expressing feelings creatively and finding harmonious solutions.',
      loveLanguage: 'physical touch',
      relationshipPace: 'moderate',
      dealbreakers: ['lack of appreciation for art', 'indoor lifestyle'],
      isPhotoRevealed: false,
      isPremium: false,
      onboardingCompleted: true,
      questionnaireStep: 10
    },
    {
      username: 'noah_k',
      password: await hashPassword('password123'),
      email: 'noah@example.com',
      name: 'Noah Kim',
      age: 33,
      gender: 'male',
      interestedGenders: ['female'],
      location: ukCities[Math.floor(Math.random() * ukCities.length)],
      bio: 'Architect, coffee connoisseur, and jazz enthusiast. Looking for someone to share quiet moments and meaningful conversations with.',
      photoUrl: 'https://randomuser.me/api/portraits/men/10.jpg',
      communicationStyle: 'I prefer deep, thoughtful conversations about feelings and ideas.',
      freeTimeActivities: ['designing', 'coffee tasting', 'listening to jazz'],
      values: 'Aesthetics, depth, and authenticity',
      conflictResolution: 'I believe in understanding different perspectives and finding creative solutions.',
      loveLanguage: 'words of affirmation',
      relationshipPace: 'slow',
      dealbreakers: ['superficiality', 'poor communication'],
      isPhotoRevealed: false,
      isPremium: false,
      onboardingCompleted: true,
      questionnaireStep: 10
    }
  ];
  
  // Insert users into the database
  for (const userData of dummyUsers) {
    try {
      const existingUser = await db.select().from(users).where(eq(users.username, userData.username));
      if (existingUser.length === 0) {
        await db.insert(users).values(userData);
        console.log(`User ${userData.username} created successfully.`);
      } else {
        console.log(`User ${userData.username} already exists.`);
      }
    } catch (error) {
      console.error(`Error creating user ${userData.username}:`, error);
    }
  }

  // Create matches between users
  console.log('Creating matches between users...');
  const allUsers = await db.select().from(users);
  
  // Function to calculate compatibility score (0-100)
  const calculateCompatibility = (user1: any, user2: any) => {
    // Simple compatibility algorithm for demonstration purposes
    let score = 70 + Math.floor(Math.random() * 31); // Base score between 70-100
    
    // Consider the location
    if (user1.location === user2.location) {
      score += 5;
    }
    
    // Consider common activities
    if (user1.freeTimeActivities && user2.freeTimeActivities) {
      const user1Activities = user1.freeTimeActivities;
      const user2Activities = user2.freeTimeActivities;
      if (Array.isArray(user1Activities) && Array.isArray(user2Activities)) {
        const commonActivities = user1Activities.filter(activity => 
          user2Activities.includes(activity)
        );
        score += commonActivities.length * 2;
      }
    }
    
    // Ensure score doesn't exceed 100
    return Math.min(score, 100);
  };
  
  // Create matches between users of compatible genders
  for (let i = 0; i < allUsers.length; i++) {
    for (let j = i + 1; j < allUsers.length; j++) {
      const user1 = allUsers[i];
      const user2 = allUsers[j];
      
      // Check gender preferences
      const user1InterestedIn = user1.interestedGenders || [];
      const user2InterestedIn = user2.interestedGenders || [];
      
      const genderMatch = (
        (Array.isArray(user1InterestedIn) && user1InterestedIn.includes(user2.gender)) &&
        (Array.isArray(user2InterestedIn) && user2InterestedIn.includes(user1.gender))
      );
      
      if (genderMatch) {
        try {
          // Check if match already exists
          const existingMatch = await db.select().from(matches).where(
            or(
              and(eq(matches.userId1, user1.id), eq(matches.userId2, user2.id)),
              and(eq(matches.userId1, user2.id), eq(matches.userId2, user1.id))
            )
          );
          
          if (existingMatch.length === 0) {
            const compatibility = calculateCompatibility(user1, user2);
            await db.insert(matches).values({
              userId1: user1.id,
              userId2: user2.id,
              compatibility,
              matchDate: new Date(),
              callCount: 0,
              callScheduled: false,
              isChatUnlocked: false,
              arePhotosRevealed: false,
              status: 'active'
            });
            console.log(`Match created between ${user1.username} and ${user2.username} with compatibility ${compatibility}%.`);
          } else {
            console.log(`Match already exists between ${user1.username} and ${user2.username}.`);
          }
        } catch (error) {
          console.error(`Error creating match between ${user1.username} and ${user2.username}:`, error);
        }
      }
    }
  }
  
  console.log('Dummy data creation completed!');
}

createDummyUsers().catch(console.error);