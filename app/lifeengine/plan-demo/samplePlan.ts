import type { PlanNotebookData } from "@/components/lifeengine/PlanNotebook";

/**
 * The sample plan on /lifeengine/plan-demo: a 7-day yoga, diet and fitness
 * plan for a vegetarian beginner in India. Ticks on it are saved like any
 * other plan, under this id.
 */
export const samplePlan: PlanNotebookData = {
  planId: "sample-7-day-plan",
  planName: "7-day wellness plan",
  userName: "Priya",
  duration: 7,
  planTypes: ["Yoga", "Diet", "Fitness"],
  plan: [
    {
      day: 1,
      theme: "Gentle start",
      notes:
        "Welcome to day 1. Keep everything easy today: the aim is to find a time that works and show up for it, not to push hard.",
      yoga: [
        {
          name: "Mountain pose (Tadasana)",
          duration: "3 minutes",
          steps: [
            "Stand with feet hip-width apart, weight spread evenly through both feet",
            "Lengthen the spine and relax the shoulders away from the ears",
            "Let the arms rest by your sides, palms facing the thighs",
            "Close your eyes if you feel steady and take slow breaths",
          ],
          breathing: "Slow breaths through the nose, letting the belly rise on each inhale.",
          benefits: "Improves posture and body awareness; a calm way to begin.",
        },
        {
          name: "Cat-cow (Marjaryasana-Bitilasana)",
          duration: "5 minutes",
          steps: [
            "Come onto hands and knees, wrists under shoulders and knees under hips",
            "Inhale, drop the belly and lift the chest and tailbone (cow)",
            "Exhale, round the back and tuck the chin and tailbone (cat)",
            "Move slowly with the breath for 10 to 12 rounds",
          ],
          breathing: "Inhale into cow, exhale into cat.",
          benefits: "Warms up the spine and eases stiffness from long hours of sitting.",
        },
        {
          name: "Alternate nostril breathing (Anulom vilom)",
          duration: "7 minutes",
          steps: [
            "Sit cross-legged or on a chair with the spine upright",
            "Close the right nostril with the right thumb and inhale through the left",
            "Close the left nostril with the ring finger, release the thumb and exhale through the right",
            "Inhale through the right, switch, and exhale through the left; that is one round",
            "Continue for 5 to 7 minutes without forcing the breath",
          ],
          breathing: "Smooth, unhurried breaths of equal length.",
          benefits: "Settles the mind and is a good habit before work or sleep.",
        },
      ],
      exercise: [
        {
          name: "Brisk walk",
          sets: 1,
          reps: "20 minutes",
          rest: "",
          formCues: ["Walk tall with relaxed shoulders", "Swing the arms naturally", "Pace where you can talk but not sing"],
          tips: ["Morning or after dinner both work", "Wear cushioned shoes, not chappals"],
        },
      ],
      meals: {
        breakfast: {
          name: "Vegetable poha with peanuts",
          recipe:
            "Rinse the poha in a sieve and leave it to soften for 5 minutes. Heat 1 tsp oil, add mustard seeds, curry leaves and peanuts and roast for a minute. Add onion, peas and grated carrot and cook for 3 minutes. Stir in turmeric, salt and the poha and cook on low heat for 2 minutes. Finish with lemon juice and coriander.",
          ingredients: [
            "1 cup thick poha",
            "1 small onion, chopped",
            "1/4 cup green peas",
            "1 small carrot, grated",
            "1 tbsp peanuts",
            "1 tsp oil, mustard seeds, curry leaves",
            "Pinch of turmeric, salt to taste",
            "Lemon juice and coriander",
          ],
          portions: "1 plate",
          macros: { calories: 320, protein: "8g", carbs: "52g", fats: "9g" },
          prepTime: "15 minutes",
        },
        lunch: {
          name: "Dal-chawal with lauki sabzi and salad",
          recipe:
            "Pressure-cook the toor dal with turmeric for 3 whistles, then temper with jeera, garlic and a little ghee. Cook the lauki with jeera, tomato and a pinch of salt until soft. Serve with a katori of rice and a cucumber-tomato salad.",
          ingredients: [
            "1/3 cup toor dal",
            "3/4 cup cooked rice",
            "1 cup lauki (bottle gourd), diced",
            "1 tomato",
            "1 tsp ghee, jeera, garlic",
            "Cucumber and tomato for salad",
          ],
          portions: "1 katori dal, 1 katori rice, 1 katori sabzi",
          macros: { calories: 480, protein: "17g", carbs: "78g", fats: "10g" },
          prepTime: "30 minutes",
        },
        snacks: [
          {
            name: "Roasted chana and a glass of chaas",
            recipe: "Have a handful of roasted chana with a glass of chaas spiced with roasted jeera and a pinch of salt.",
            ingredients: ["30 g roasted chana", "1 glass buttermilk", "Roasted jeera powder, salt"],
            portions: "1 small bowl and 1 glass",
            macros: { calories: 170, protein: "9g", carbs: "22g", fats: "4g" },
            prepTime: "2 minutes",
          },
        ],
        dinner: {
          name: "Phulka with palak paneer",
          recipe:
            "Blanch the spinach for 2 minutes, cool it and blend to a purée. Sauté onion, ginger, garlic and tomato in 1 tsp oil, add the purée and simmer for 5 minutes. Add cubed paneer and garam masala and cook for 2 more minutes. Serve with 2 phulkas made without ghee.",
          ingredients: ["2 cups spinach", "60 g paneer", "1 onion, 1 tomato", "Ginger, garlic", "1 tsp oil, garam masala", "2 phulkas"],
          portions: "2 phulkas and 1 katori palak paneer",
          macros: { calories: 430, protein: "20g", carbs: "42g", fats: "19g" },
          prepTime: "30 minutes",
        },
      },
      tips: [
        "Start the day with a glass of plain or warm water before tea.",
        "Wait 2 to 3 hours after a meal before yoga, or practise first thing in the morning.",
        "Keep dinner at least 2 hours before bed.",
      ],
    },
    {
      day: 2,
      theme: "Strength basics",
      notes: "Day 2 adds simple strength work. Move slowly and keep good form; quality matters more than the number of reps.",
      yoga: [
        {
          name: "Sun salutation, slow pace (Surya namaskar)",
          duration: "10 minutes",
          steps: [
            "Stand with palms together at the chest (pranamasana)",
            "Inhale and raise the arms overhead, exhale and fold forward",
            "Step the right leg back into a lunge, then come into plank",
            "Lower the knees, chest and chin, then lift into a gentle cobra",
            "Lift the hips into downward dog for 3 breaths",
            "Step forward, fold, rise up and return to palms at the chest",
            "Repeat on the left side; do 4 to 6 rounds in total",
          ],
          breathing: "Inhale as you lift or open, exhale as you fold or lower.",
          benefits: "Works the whole body and builds gentle heat.",
        },
        {
          name: "Warrior II (Virabhadrasana II)",
          duration: "5 minutes",
          steps: [
            "Step the feet wide apart, turn the right foot out and the left foot slightly in",
            "Bend the right knee over the ankle, keeping the left leg straight",
            "Stretch the arms out at shoulder height and look over the right hand",
            "Hold for 5 breaths, then change sides; repeat twice",
          ],
          breathing: "Steady breaths through the nose.",
          benefits: "Strengthens the legs and opens the hips.",
        },
        {
          name: "Humming bee breath (Bhramari)",
          duration: "5 minutes",
          steps: [
            "Sit comfortably and close the eyes",
            "Place the index fingers gently on the ear cartilage",
            "Inhale deeply, then hum softly like a bee as you breathe out",
            "Repeat 7 to 9 times",
          ],
          breathing: "Long exhale with a soft hum.",
          benefits: "Calms the nerves; useful on stressful days.",
        },
      ],
      exercise: [
        {
          name: "Bodyweight squats",
          sets: 3,
          reps: "10-12",
          rest: "60 seconds",
          formCues: ["Feet shoulder-width apart", "Sit back as if onto a chair", "Keep the knees in line with the toes"],
          tips: ["Hold the back of a chair if balance is hard", "Breathe out as you stand up"],
        },
        {
          name: "Wall push-ups",
          sets: 3,
          reps: "10",
          rest: "60 seconds",
          formCues: ["Hands at chest height on the wall", "Body in one straight line", "Lower the chest towards the wall with control"],
          tips: ["Move to a kitchen platform or knees on the floor as it gets easy"],
        },
        {
          name: "Glute bridge",
          sets: 3,
          reps: "12",
          rest: "45 seconds",
          formCues: ["Lie on your back, knees bent", "Press through the heels to lift the hips", "Pause at the top for a second"],
          tips: ["Good for people who sit all day"],
        },
      ],
      meals: {
        breakfast: {
          name: "Moong dal cheela with mint chutney",
          recipe:
            "Soak the moong dal for 4 hours or overnight and grind it with ginger and green chilli into a smooth batter. Add salt, chopped onion and coriander. Spread a ladle of batter thin on a hot tawa with a few drops of oil and cook both sides until golden. Serve with mint-coriander chutney.",
          ingredients: [
            "1/2 cup yellow moong dal, soaked",
            "1 small onion, chopped",
            "Ginger, green chilli, coriander",
            "1 tsp oil",
            "Mint chutney",
          ],
          portions: "2 cheelas",
          macros: { calories: 300, protein: "16g", carbs: "40g", fats: "7g" },
          prepTime: "20 minutes (plus soaking)",
        },
        lunch: {
          name: "Rajma with brown rice and cucumber raita",
          recipe:
            "Pressure-cook soaked rajma until soft. Cook onion, ginger, garlic and tomato into a masala, add the rajma and simmer for 10 minutes. Serve with a katori of brown rice and raita made with curd, grated cucumber and roasted jeera.",
          ingredients: ["1/2 cup rajma, soaked overnight", "3/4 cup cooked brown rice", "1 onion, 1 tomato", "Ginger, garlic", "1 katori curd", "1/2 cucumber"],
          portions: "1 katori rajma, 1 katori rice, 1 katori raita",
          macros: { calories: 520, protein: "21g", carbs: "82g", fats: "11g" },
          prepTime: "40 minutes",
        },
        snacks: [
          {
            name: "Sprouts chaat",
            recipe: "Mix steamed moong sprouts with onion, tomato, cucumber, lemon juice, chaat masala and coriander.",
            ingredients: ["1 cup moong sprouts", "Onion, tomato, cucumber", "Lemon juice, chaat masala", "Coriander"],
            portions: "1 bowl",
            macros: { calories: 150, protein: "10g", carbs: "24g", fats: "1g" },
            prepTime: "10 minutes",
          },
        ],
        dinner: {
          name: "Jowar roti with mixed vegetable sabzi and dal",
          recipe:
            "Knead jowar flour with warm water and pat out rotis by hand or between sheets. Cook on a hot tawa on both sides. Serve with a dry sabzi of beans, carrot and cabbage and a small katori of moong dal.",
          ingredients: ["2 jowar rotis", "1 cup mixed vegetables", "1 small katori moong dal", "1 tsp oil, jeera, turmeric"],
          portions: "2 rotis, 1 katori sabzi, 1 small katori dal",
          macros: { calories: 420, protein: "16g", carbs: "66g", fats: "9g" },
          prepTime: "30 minutes",
        },
      },
      tips: [
        "A 10-minute walk after lunch helps digestion and steadies blood sugar.",
        "Mild soreness tomorrow is normal; sharp pain is not, so stop and rest if you feel it.",
        "Keep screens away for the last 30 minutes before bed.",
      ],
    },
    {
      day: 3,
      theme: "Active recovery",
      notes: "Day 3 is lighter. Gentle movement and restful yoga help the body recover from yesterday's strength work.",
      yoga: [
        {
          name: "Child's pose (Balasana)",
          duration: "4 minutes",
          steps: [
            "Kneel, bring the big toes together and the knees apart",
            "Sit the hips back towards the heels and stretch the arms forward",
            "Rest the forehead on the mat or a cushion",
            "Breathe into the back of the ribs",
          ],
          breathing: "Slow breaths; feel the back widen as you inhale.",
          benefits: "Releases the lower back and hips.",
        },
        {
          name: "Legs up the wall (Viparita karani)",
          duration: "6 minutes",
          steps: [
            "Sit sideways next to a wall, then swing the legs up as you lie back",
            "Keep the hips close to the wall and the arms relaxed",
            "Stay for 5 to 6 minutes and come out slowly by rolling to one side",
          ],
          breathing: "Natural breathing.",
          benefits: "Rests tired legs and calms the nervous system. Skip during periods if it feels uncomfortable.",
        },
        {
          name: "Yoga nidra (guided rest)",
          duration: "10 minutes",
          steps: [
            "Lie on your back in shavasana with a light cover",
            "Move your attention slowly from the toes to the head, relaxing each part",
            "Stay still and let the breath be easy",
          ],
          breathing: "No effort; simply notice the breath.",
          benefits: "Deep rest; a good reset on a busy day.",
        },
      ],
      exercise: [
        {
          name: "Easy walk",
          sets: 1,
          reps: "20 minutes",
          rest: "",
          formCues: ["A comfortable, chatty pace"],
          tips: ["A park or terrace walk in the evening works well"],
        },
      ],
      meals: {
        breakfast: {
          name: "Vegetable upma",
          recipe:
            "Dry-roast the rava until fragrant and set it aside. Temper mustard seeds, urad dal and curry leaves in 1 tsp oil, then cook onion, carrot, beans and peas for 3 minutes. Add 2 cups of hot water and salt, bring to a boil and stir in the rava. Cover and cook on low heat for 3 minutes.",
          ingredients: ["1/2 cup rava (sooji)", "1 cup mixed vegetables", "1 small onion", "1 tsp oil, mustard seeds, urad dal, curry leaves"],
          portions: "1 plate",
          macros: { calories: 310, protein: "8g", carbs: "50g", fats: "8g" },
          prepTime: "20 minutes",
        },
        lunch: {
          name: "Moong dal khichdi with curd",
          recipe:
            "Wash rice and moong dal together. Temper jeera and hing in 1 tsp ghee, add the rice, dal, turmeric, salt and 3 cups of water and pressure-cook for 3 whistles. Serve soft with a katori of curd and a little salad.",
          ingredients: ["1/4 cup rice", "1/4 cup yellow moong dal", "1 tsp ghee, jeera, hing, turmeric", "1 katori curd"],
          portions: "1 bowl khichdi and 1 katori curd",
          macros: { calories: 430, protein: "17g", carbs: "68g", fats: "10g" },
          prepTime: "25 minutes",
        },
        snacks: [
          {
            name: "Papaya with a few almonds",
            recipe: "Have a bowl of ripe papaya with 6 to 8 soaked almonds.",
            ingredients: ["1 bowl papaya", "6 to 8 almonds, soaked"],
            portions: "1 bowl",
            macros: { calories: 140, protein: "4g", carbs: "18g", fats: "7g" },
            prepTime: "5 minutes",
          },
        ],
        dinner: {
          name: "Vegetable dalia khichdi",
          recipe:
            "Roast the broken wheat in a pressure cooker with 1 tsp ghee and jeera. Add moong dal, chopped vegetables, turmeric, salt and 3 cups of water. Cook for 3 whistles and serve warm.",
          ingredients: ["1/3 cup dalia (broken wheat)", "2 tbsp moong dal", "1 cup mixed vegetables", "1 tsp ghee, jeera, turmeric"],
          portions: "1 bowl",
          macros: { calories: 360, protein: "13g", carbs: "60g", fats: "8g" },
          prepTime: "25 minutes",
        },
      },
      tips: [
        "A warm shower and an early night are the best recovery tools.",
        "Prepare tomorrow's breakfast tonight: soak dal or chop vegetables.",
        "Spend a few minutes on a hobby, a call with family or reading.",
      ],
    },
    {
      day: 4,
      theme: "Core and balance",
      notes: "Day 4 focuses on a steady core and balance, which protect the lower back in daily life.",
      yoga: [
        {
          name: "Tree pose (Vrikshasana)",
          duration: "5 minutes",
          steps: [
            "Stand tall and shift the weight onto the left foot",
            "Place the right sole on the inner calf or thigh, never on the knee",
            "Bring the palms together at the chest and fix the gaze on one point",
            "Hold for 5 breaths, then change sides; repeat twice",
          ],
          breathing: "Calm, even breaths.",
          benefits: "Improves balance and focus.",
        },
        {
          name: "Bridge pose (Setu bandhasana)",
          duration: "5 minutes",
          steps: [
            "Lie on your back with the knees bent and the feet hip-width apart",
            "Press into the feet and lift the hips, keeping the knees parallel",
            "Hold for 5 breaths and lower slowly; repeat 3 times",
          ],
          breathing: "Inhale to lift, breathe steadily in the hold, exhale to lower.",
          benefits: "Strengthens the back and glutes and opens the chest.",
        },
        {
          name: "Nadi shodhana with a short meditation",
          duration: "8 minutes",
          steps: [
            "Do 5 minutes of alternate nostril breathing as on day 1",
            "Rest the hands on the knees and sit quietly for 3 minutes",
          ],
          breathing: "Smooth and equal through each nostril.",
          benefits: "Helps concentration and lowers stress.",
        },
      ],
      exercise: [
        {
          name: "Forearm plank",
          sets: 3,
          reps: "20-30 seconds",
          rest: "45 seconds",
          formCues: ["Elbows under the shoulders", "Body in a straight line from head to heels", "Draw the belly in gently"],
          tips: ["Drop the knees to the floor if the back starts to sag"],
        },
        {
          name: "Bird-dog",
          sets: 3,
          reps: "8 each side",
          rest: "45 seconds",
          formCues: ["On hands and knees, reach the opposite arm and leg out", "Keep the hips level", "Move slowly"],
          tips: ["Kind to the lower back"],
        },
        {
          name: "Side-lying leg raises",
          sets: 2,
          reps: "12 each side",
          rest: "30 seconds",
          formCues: ["Lie on one side, legs straight", "Lift the top leg without rolling back"],
          tips: ["Strengthens the hips, which helps the knees too"],
        },
      ],
      meals: {
        breakfast: {
          name: "Idli with sambar",
          recipe:
            "Steam the idlis from ready batter for 10 to 12 minutes. Cook toor dal with drumstick, onion and tomato, add sambar powder and tamarind and simmer for 10 minutes. Serve 3 idlis with a bowl of sambar and a spoon of coconut chutney.",
          ingredients: ["3 idlis", "1/4 cup toor dal", "Drumstick, onion, tomato", "Sambar powder, tamarind", "1 tbsp coconut chutney"],
          portions: "3 idlis and 1 bowl sambar",
          macros: { calories: 340, protein: "13g", carbs: "60g", fats: "5g" },
          prepTime: "25 minutes",
        },
        lunch: {
          name: "Chole with roti and salad",
          recipe:
            "Pressure-cook soaked chickpeas until soft. Cook onion, ginger, garlic and tomato with chole masala, add the chickpeas and simmer for 10 minutes. Serve with 2 rotis and an onion-cucumber salad with lemon.",
          ingredients: ["1/2 cup kabuli chana, soaked", "2 whole-wheat rotis", "1 onion, 1 tomato", "Ginger, garlic, chole masala", "Salad vegetables"],
          portions: "2 rotis and 1 katori chole",
          macros: { calories: 510, protein: "20g", carbs: "78g", fats: "12g" },
          prepTime: "40 minutes",
        },
        snacks: [
          {
            name: "Roasted makhana",
            recipe: "Roast makhana in a pan with 1/2 tsp ghee, a pinch of salt and black pepper until crisp.",
            ingredients: ["1 cup makhana", "1/2 tsp ghee", "Salt, black pepper"],
            portions: "1 bowl",
            macros: { calories: 120, protein: "4g", carbs: "18g", fats: "3g" },
            prepTime: "5 minutes",
          },
        ],
        dinner: {
          name: "Paneer bhurji with roti",
          recipe:
            "Sauté onion, tomato and capsicum in 1 tsp oil with turmeric and a little red chilli. Crumble in the paneer, add salt and coriander and cook for 2 minutes. Serve with 2 rotis.",
          ingredients: ["80 g paneer", "1 onion, 1 tomato, 1/2 capsicum", "1 tsp oil, turmeric", "2 rotis"],
          portions: "2 rotis and 1 katori bhurji",
          macros: { calories: 450, protein: "23g", carbs: "40g", fats: "21g" },
          prepTime: "20 minutes",
        },
      },
      tips: [
        "Include a protein in every meal: dal, paneer, curd, sprouts or chana.",
        "Sit less: stand up and stretch for a minute every hour at work.",
        "Write down one thing that felt easier than on day 1.",
      ],
    },
    {
      day: 5,
      theme: "Stamina",
      notes: "Day 5 builds stamina with a slightly longer flow and a walk with short faster stretches.",
      yoga: [
        {
          name: "Sun salutation (Surya namaskar)",
          duration: "12 minutes",
          steps: [
            "Follow the same sequence as day 2",
            "Do 8 rounds at a steady pace, resting in mountain pose between rounds if needed",
          ],
          breathing: "One movement per breath.",
          benefits: "Builds stamina and flexibility together.",
        },
        {
          name: "Chair pose (Utkatasana)",
          duration: "4 minutes",
          steps: [
            "Stand with the feet together or hip-width apart",
            "Bend the knees and sit back as if onto a chair, arms raised",
            "Hold for 5 breaths; repeat 3 times",
          ],
          breathing: "Steady breaths; do not hold the breath.",
          benefits: "Strengthens the thighs and builds endurance.",
        },
        {
          name: "Cobra pose (Bhujangasana)",
          duration: "4 minutes",
          steps: [
            "Lie on the stomach with the palms under the shoulders",
            "Inhale and lift the chest, keeping the elbows close and bent",
            "Hold for 3 breaths and lower; repeat 4 times",
          ],
          breathing: "Inhale to lift, exhale to lower.",
          benefits: "Strengthens the back and counters slouching.",
        },
      ],
      exercise: [
        {
          name: "Walk with faster stretches",
          sets: 5,
          reps: "2 min brisk + 2 min easy",
          rest: "",
          formCues: ["Brisk enough to breathe harder but still say a short sentence"],
          tips: ["Total about 20 minutes", "Add 5 minutes of easy walking to warm up and cool down"],
        },
        {
          name: "Step-ups",
          sets: 3,
          reps: "10 each leg",
          rest: "60 seconds",
          formCues: ["Use a sturdy step or the bottom stair", "Push through the whole foot", "Step down with control"],
          tips: ["Hold the railing for balance"],
        },
      ],
      meals: {
        breakfast: {
          name: "Savoury vegetable dalia",
          recipe:
            "Roast the dalia in 1 tsp oil with jeera and mustard seeds. Add chopped onion, carrot, beans and peas, then 2 cups of water and salt. Cook covered until soft, about 12 minutes in a pan or 2 whistles in a cooker.",
          ingredients: ["1/3 cup dalia", "1 cup mixed vegetables", "1 small onion", "1 tsp oil, jeera, mustard seeds"],
          portions: "1 bowl",
          macros: { calories: 300, protein: "9g", carbs: "52g", fats: "6g" },
          prepTime: "20 minutes",
        },
        lunch: {
          name: "Sambar rice with beans poriyal",
          recipe:
            "Mix a katori of rice with sambar made as on day 4. Stir-fry chopped beans with mustard seeds, curry leaves and grated coconut. Serve with a katori of curd.",
          ingredients: ["3/4 cup cooked rice", "1 bowl sambar", "1 cup French beans", "1 tbsp grated coconut", "1 katori curd"],
          portions: "1 plate and 1 katori curd",
          macros: { calories: 500, protein: "17g", carbs: "80g", fats: "12g" },
          prepTime: "30 minutes",
        },
        snacks: [
          {
            name: "Banana and a glass of milk",
            recipe: "Have a banana with a glass of milk, about an hour after the walk.",
            ingredients: ["1 banana", "1 glass toned milk"],
            portions: "1 banana and 1 glass",
            macros: { calories: 230, protein: "9g", carbs: "38g", fats: "5g" },
            prepTime: "1 minute",
          },
        ],
        dinner: {
          name: "Soya chunk curry with roti",
          recipe:
            "Soak the soya chunks in hot water for 10 minutes and squeeze out the water. Cook onion, ginger, garlic and tomato with jeera and garam masala, add the soya chunks and a little water and simmer for 8 minutes. Serve with 2 rotis.",
          ingredients: ["1/2 cup soya chunks", "1 onion, 1 tomato", "Ginger, garlic, garam masala", "1 tsp oil", "2 rotis"],
          portions: "2 rotis and 1 katori curry",
          macros: { calories: 440, protein: "28g", carbs: "52g", fats: "11g" },
          prepTime: "30 minutes",
        },
      },
      tips: [
        "Drink water before, during and after the walk, more so in summer.",
        "If you feel dizzy or breathless, slow down and rest.",
        "Prefer jowar, bajra or ragi rotis on some days for extra fibre.",
      ],
    },
    {
      day: 6,
      theme: "Mobility and calm",
      notes: "Day 6 is about loosening tight spots from the week and winding down well.",
      yoga: [
        {
          name: "Wind-relieving pose (Pawanmuktasana)",
          duration: "5 minutes",
          steps: [
            "Lie on your back and hug the right knee to the chest for 3 breaths",
            "Change legs, then hug both knees and rock gently side to side",
          ],
          breathing: "Exhale as you draw the knee in.",
          benefits: "Eases gas and bloating and relaxes the lower back.",
        },
        {
          name: "Half spinal twist (Ardha matsyendrasana)",
          duration: "5 minutes",
          steps: [
            "Sit with the legs straight, bend the right knee and place the foot outside the left knee",
            "Hug the right knee with the left arm and twist gently to the right",
            "Hold for 5 breaths and change sides",
          ],
          breathing: "Lengthen on the inhale, twist a little more on the exhale.",
          benefits: "Improves spinal mobility and digestion.",
        },
        {
          name: "Corpse pose with humming breath (Shavasana and Bhramari)",
          duration: "10 minutes",
          steps: [
            "Do 7 rounds of bhramari while seated",
            "Lie down in shavasana for 7 to 8 minutes and let the body go heavy",
          ],
          breathing: "Long humming exhales, then natural breathing.",
          benefits: "Deep relaxation before the weekend.",
        },
      ],
      exercise: [
        {
          name: "Evening walk",
          sets: 1,
          reps: "25 minutes",
          rest: "",
          formCues: ["Comfortable pace"],
          tips: ["Walk with family or a friend if you can"],
        },
      ],
      meals: {
        breakfast: {
          name: "Besan chilla with curd",
          recipe:
            "Whisk besan with water, salt, ajwain, chopped onion, tomato and coriander into a pouring batter. Cook thin chillas on a tawa with a few drops of oil until golden on both sides. Serve with a katori of curd.",
          ingredients: ["1/2 cup besan", "1 small onion, 1 small tomato", "Ajwain, coriander, salt", "1 tsp oil", "1 katori curd"],
          portions: "2 chillas and 1 katori curd",
          macros: { calories: 330, protein: "16g", carbs: "36g", fats: "12g" },
          prepTime: "15 minutes",
        },
        lunch: {
          name: "Kadhi-chawal with salad",
          recipe:
            "Whisk curd with besan and water, then simmer with turmeric and salt for 15 minutes, stirring often. Temper with jeera, methi seeds and curry leaves. Serve with a katori of rice and a carrot-cucumber salad.",
          ingredients: ["1 cup curd", "2 tbsp besan", "3/4 cup cooked rice", "Jeera, methi seeds, curry leaves", "Carrot and cucumber"],
          portions: "1 katori kadhi and 1 katori rice",
          macros: { calories: 450, protein: "15g", carbs: "70g", fats: "12g" },
          prepTime: "30 minutes",
        },
        snacks: [
          {
            name: "Coconut water and peanuts",
            recipe: "Have a glass of tender coconut water with a small handful of roasted peanuts.",
            ingredients: ["1 tender coconut", "20 g roasted peanuts"],
            portions: "1 glass and a small handful",
            macros: { calories: 170, protein: "6g", carbs: "14g", fats: "10g" },
            prepTime: "2 minutes",
          },
        ],
        dinner: {
          name: "Methi thepla with curd and sabzi",
          recipe:
            "Knead whole-wheat flour with chopped methi, curd, turmeric, ajwain and salt into a soft dough. Roll thin theplas and cook on a tawa with a little oil. Serve 2 theplas with curd and a small katori of dry aloo-gobhi.",
          ingredients: ["2/3 cup whole-wheat flour", "1/2 cup methi leaves", "2 tbsp curd", "Turmeric, ajwain", "1 katori curd", "1 small katori aloo-gobhi"],
          portions: "2 theplas, curd and sabzi",
          macros: { calories: 440, protein: "15g", carbs: "62g", fats: "14g" },
          prepTime: "30 minutes",
        },
      },
      tips: [
        "Weekend plans? Pick one active outing: a walk in a park, cycling or a short trek.",
        "Keep tea and coffee to before 3 pm so sleep is not affected.",
        "At family meals, fill half the plate with sabzi and salad first.",
      ],
    },
    {
      day: 7,
      theme: "Review and reset",
      notes:
        "Day 7: well done on finishing the week. Look back at what worked, and plan next week around the times you actually managed.",
      yoga: [
        {
          name: "Gentle flow",
          duration: "15 minutes",
          steps: [
            "3 rounds of slow sun salutation",
            "Cat-cow for 1 minute",
            "Tree pose, 3 breaths each side",
            "Bridge pose, 2 rounds",
            "Child's pose for 1 minute",
          ],
          breathing: "Let the breath lead every movement.",
          benefits: "Brings together everything from the week.",
        },
        {
          name: "Seated meditation",
          duration: "8 minutes",
          steps: [
            "Sit comfortably with the eyes closed",
            "Count 10 slow breaths, then start again from one",
            "If the mind wanders, notice it and come back to the count",
          ],
          breathing: "Natural breathing.",
          benefits: "Builds a simple daily calm habit.",
        },
      ],
      exercise: [
        {
          name: "Brisk walk",
          sets: 1,
          reps: "30 minutes",
          rest: "",
          formCues: ["Brisk but comfortable"],
          tips: ["Compare how this feels with the walk on day 1"],
        },
      ],
      meals: {
        breakfast: {
          name: "Gobhi paratha with curd",
          recipe:
            "Mix grated cauliflower with salt, ajwain, green chilli and coriander and squeeze out the water. Stuff into whole-wheat dough, roll gently and cook on a tawa with 1 tsp ghee. Serve 1 paratha with a katori of curd.",
          ingredients: ["1/2 cup whole-wheat flour", "1/2 cup grated cauliflower", "Ajwain, green chilli, coriander", "1 tsp ghee", "1 katori curd"],
          portions: "1 paratha and 1 katori curd",
          macros: { calories: 360, protein: "12g", carbs: "48g", fats: "13g" },
          prepTime: "25 minutes",
        },
        lunch: {
          name: "Dal tadka with jeera rice and salad",
          recipe:
            "Cook a mix of toor and masoor dal with turmeric. Temper with ghee, jeera, garlic, red chilli and tomato. Serve with a katori of jeera rice and a large salad.",
          ingredients: ["1/3 cup mixed dal", "3/4 cup cooked jeera rice", "1 tsp ghee, jeera, garlic", "1 tomato", "Salad vegetables"],
          portions: "1 katori dal, 1 katori rice and salad",
          macros: { calories: 490, protein: "18g", carbs: "80g", fats: "11g" },
          prepTime: "30 minutes",
        },
        snacks: [
          {
            name: "Fruit chaat",
            recipe: "Mix chopped apple, guava, pomegranate and orange with a squeeze of lemon and a pinch of chaat masala.",
            ingredients: ["1 bowl seasonal fruit", "Lemon juice", "Chaat masala"],
            portions: "1 bowl",
            macros: { calories: 130, protein: "2g", carbs: "30g", fats: "1g" },
            prepTime: "10 minutes",
          },
        ],
        dinner: {
          name: "Vegetable khichdi with kadhi",
          recipe:
            "Pressure-cook rice, moong dal and chopped vegetables with turmeric and salt for 3 whistles. Temper with ghee and jeera. Serve with a small katori of kadhi or curd.",
          ingredients: ["1/4 cup rice", "1/4 cup moong dal", "1 cup mixed vegetables", "1 tsp ghee, jeera", "1 small katori kadhi"],
          portions: "1 bowl khichdi and 1 small katori kadhi",
          macros: { calories: 420, protein: "16g", carbs: "66g", fats: "10g" },
          prepTime: "25 minutes",
        },
      },
      tips: [
        "Note your energy, sleep and mood this week compared with the start.",
        "Choose two habits to keep next week, such as the morning walk and the after-lunch stroll.",
        "Talk to your doctor before big changes if you have a health condition or take medicines.",
      ],
    },
  ],
};
