"use client";

import { useState } from "react";
import { BookOpen, CalendarDays, Download, ListChecks, Printer, Smartphone } from "lucide-react";
import PlanNotebook, { PlanNotebookData } from "@/components/lifeengine/PlanNotebook";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

// Sample data for demonstration
const samplePlan: PlanNotebookData = {
  planName: "7-Day Wellness Journey",
  userName: "Sample User",
  duration: 7,
  planTypes: ["Yoga", "Diet", "Fitness"],
  createdAt: new Date().toISOString(),
  plan: [
    {
      day: 1,
      yoga: [
        {
          name: "Sun Salutation (Surya Namaskar)",
          duration: "15 minutes",
          steps: [
            "Stand at the top of your mat in Mountain Pose (Tadasana)",
            "Inhale and raise your arms overhead in Upward Salute",
            "Exhale and fold forward into Standing Forward Bend",
            "Inhale and step back into Plank Pose",
            "Exhale and lower into Chaturanga",
            "Inhale into Upward-Facing Dog",
            "Exhale into Downward-Facing Dog, hold for 5 breaths",
            "Walk or jump feet forward, inhale halfway lift",
            "Exhale fold forward, then inhale rise up with arms overhead",
            "Exhale hands to heart center",
          ],
          breathing: "Coordinate each movement with breath - inhale for upward movements, exhale for forward folds",
          benefits: "Builds heat, improves flexibility, energizes the body",
        },
        {
          name: "Warrior II (Virabhadrasana II)",
          duration: "10 minutes",
          steps: [
            "Start in Mountain Pose at the top of your mat",
            "Step your left foot back about 3-4 feet",
            "Turn your left foot parallel to the back of the mat",
            "Bend your right knee to 90 degrees, keeping knee over ankle",
            "Extend arms parallel to the floor, palms down",
            "Gaze over your right fingertips",
            "Hold for 5-10 breaths, then switch sides",
          ],
          breathing: "Deep, steady breaths through the nose",
          benefits: "Strengthens legs, opens hips, builds stamina and concentration",
        },
      ],
      exercise: [
        {
          name: "Push-ups",
          sets: 3,
          reps: "10-12",
          rest: "60 seconds",
          formCues: [
            "Keep your body in a straight line from head to heels",
            "Lower until chest nearly touches the floor",
            "Keep elbows at 45-degree angle from body",
          ],
          tips: [
            "Modify on knees if needed",
            "Focus on controlled movement",
            "Engage your core throughout",
          ],
        },
        {
          name: "Bodyweight Squats",
          sets: 3,
          reps: "15-20",
          rest: "60 seconds",
          formCues: [
            "Feet shoulder-width apart, toes slightly out",
            "Lower hips back and down, keeping chest up",
            "Knees track over toes, don't cave inward",
            "Descend until thighs parallel to floor",
          ],
          tips: [
            "Keep weight in heels",
            "Can hold arms out front for balance",
            "Breathe out as you stand up",
          ],
        },
      ],
      meals: {
        breakfast: {
          name: "Overnight Oats with Berries",
          recipe: `Mix 1/2 cup rolled oats with 1 cup almond milk in a jar. Add 1 tablespoon chia seeds, 
1 teaspoon honey, and a pinch of cinnamon. Refrigerate overnight. 
In the morning, top with fresh berries, sliced banana, and a sprinkle of granola.`,
          ingredients: [
            "1/2 cup rolled oats",
            "1 cup almond milk",
            "1 tablespoon chia seeds",
            "1 teaspoon honey",
            "Pinch of cinnamon",
            "1/2 cup mixed berries",
            "1 banana",
            "2 tablespoons granola",
          ],
          portions: "1 bowl (serves 1)",
          macros: {
            calories: 380,
            protein: "12g",
            carbs: "65g",
            fats: "8g",
          },
          prepTime: "5 minutes (plus overnight soak)",
        },
        lunch: {
          name: "Mediterranean Quinoa Bowl",
          recipe: `Cook 1 cup quinoa according to package. While warm, mix in cherry tomatoes, cucumber, 
red onion, kalamata olives, and crumbled feta. Dress with olive oil, lemon juice, salt, and oregano. 
Add chickpeas for extra protein. Serve warm or cold.`,
          ingredients: [
            "1 cup cooked quinoa",
            "1 cup cherry tomatoes, halved",
            "1/2 cucumber, diced",
            "1/4 red onion, thinly sliced",
            "1/4 cup kalamata olives",
            "1/4 cup feta cheese",
            "1/2 cup chickpeas",
            "2 tablespoons olive oil",
            "Juice of 1 lemon",
            "Fresh oregano",
          ],
          portions: "1 large bowl (serves 1)",
          macros: {
            calories: 520,
            protein: "18g",
            carbs: "62g",
            fats: "22g",
          },
          prepTime: "20 minutes",
        },
        dinner: {
          name: "Grilled Salmon with Roasted Vegetables",
          recipe: `Season salmon fillet with salt, pepper, and lemon. Grill for 4-5 minutes per side. 
Meanwhile, toss broccoli, bell peppers, and zucchini with olive oil, garlic, and herbs. 
Roast at 425°F for 20 minutes. Serve salmon over vegetables with a lemon wedge.`,
          ingredients: [
            "6 oz salmon fillet",
            "1 cup broccoli florets",
            "1 bell pepper, sliced",
            "1 zucchini, sliced",
            "2 tablespoons olive oil",
            "2 cloves garlic, minced",
            "Fresh herbs (thyme, rosemary)",
            "Lemon",
            "Salt and pepper",
          ],
          portions: "1 plate (serves 1)",
          macros: {
            calories: 450,
            protein: "38g",
            carbs: "18g",
            fats: "26g",
          },
          prepTime: "30 minutes",
        },
      },
      tips: [
        "Drink at least 8 glasses of water throughout the day",
        "Aim for 7-8 hours of quality sleep tonight",
        "Take 5 minutes for mindful breathing before bed",
        "Journal about your goals and intentions for this wellness journey",
      ],
      notes: "Welcome to Day 1! Focus on building consistency and listening to your body.",
    },
    {
      day: 2,
      yoga: [
        {
          name: "Cat-Cow Stretch (Marjaryasana-Bitilasana)",
          duration: "8 minutes",
          steps: [
            "Start on hands and knees in tabletop position",
            "Inhale, drop belly, lift chest and tailbone (Cow)",
            "Exhale, round spine, tuck chin and tailbone (Cat)",
            "Continue flowing between poses with breath",
            "Repeat for 10-15 rounds",
          ],
          breathing: "Synchronized with movement - inhale for Cow, exhale for Cat",
          benefits: "Warms up spine, improves posture, relieves back tension",
        },
        {
          name: "Child's Pose (Balasana)",
          duration: "5 minutes",
          steps: [
            "From tabletop, bring big toes together, knees wide",
            "Sit hips back towards heels",
            "Extend arms forward or alongside body",
            "Rest forehead on mat",
            "Breathe deeply into back body",
          ],
          breathing: "Deep, calming breaths - feel ribs expand into thighs",
          benefits: "Gentle stretch for hips, thighs, and ankles; promotes relaxation",
        },
      ],
      exercise: [
        {
          name: "Plank Hold",
          sets: 3,
          reps: "30-45 seconds",
          rest: "60 seconds",
          formCues: [
            "Forearms parallel, elbows under shoulders",
            "Body forms straight line from head to heels",
            "Engage core, glutes, and quads",
            "Neutral neck position, gaze down",
          ],
          tips: [
            "Don't let hips sag or pike up",
            "Breathe steadily throughout",
            "Start with shorter holds if needed",
          ],
        },
        {
          name: "Lunges (Alternating)",
          sets: 3,
          reps: "10 each leg",
          rest: "60 seconds",
          formCues: [
            "Step forward with right leg, both knees bend to 90 degrees",
            "Back knee hovers just above floor",
            "Front knee stays over ankle",
            "Push through front heel to return to start",
          ],
          tips: [
            "Keep torso upright",
            "Can hold light weights for extra challenge",
            "Maintain balance with core engagement",
          ],
        },
      ],
      meals: {
        breakfast: {
          name: "Green Smoothie Bowl",
          recipe: `Blend 1 frozen banana, 1 cup spinach, 1/2 avocado, 1/2 cup Greek yogurt, and 1/2 cup almond milk until smooth. 
Pour into bowl and top with sliced kiwi, hemp seeds, coconut flakes, and almond butter drizzle.`,
          ingredients: [
            "1 frozen banana",
            "1 cup fresh spinach",
            "1/2 avocado",
            "1/2 cup Greek yogurt",
            "1/2 cup almond milk",
            "1 kiwi, sliced",
            "1 tablespoon hemp seeds",
            "2 tablespoons coconut flakes",
            "1 tablespoon almond butter",
          ],
          portions: "1 bowl",
          macros: {
            calories: 420,
            protein: "15g",
            carbs: "48g",
            fats: "20g",
          },
          prepTime: "10 minutes",
        },
        lunch: {
          name: "Asian-Inspired Chicken Lettuce Wraps",
          recipe: `Sauté ground chicken with garlic, ginger, and soy sauce. Add diced water chestnuts, carrots, and scallions. 
Spoon mixture into butter lettuce leaves. Top with sriracha mayo and sesame seeds.`,
          ingredients: [
            "6 oz ground chicken",
            "2 cloves garlic, minced",
            "1 teaspoon fresh ginger, grated",
            "2 tablespoons soy sauce",
            "1/4 cup water chestnuts, diced",
            "1 carrot, shredded",
            "2 scallions, sliced",
            "6 butter lettuce leaves",
            "Sriracha mayo",
            "Sesame seeds",
          ],
          portions: "6 wraps",
          macros: {
            calories: 380,
            protein: "32g",
            carbs: "22g",
            fats: "18g",
          },
          prepTime: "25 minutes",
        },
        dinner: {
          name: "Vegetable Stir-Fry with Brown Rice",
          recipe: `Cook brown rice. In wok, stir-fry broccoli, snap peas, bell peppers, mushrooms, and tofu in sesame oil. 
Add sauce made from soy sauce, rice vinegar, honey, and garlic. Serve over rice, garnish with cashews.`,
          ingredients: [
            "1 cup cooked brown rice",
            "1 cup broccoli florets",
            "1/2 cup snap peas",
            "1 red bell pepper, sliced",
            "1 cup mushrooms, sliced",
            "4 oz firm tofu, cubed",
            "2 tablespoons sesame oil",
            "3 tablespoons soy sauce",
            "1 tablespoon rice vinegar",
            "1 teaspoon honey",
            "2 cloves garlic",
            "1/4 cup cashews",
          ],
          portions: "1 large plate",
          macros: {
            calories: 510,
            protein: "20g",
            carbs: "68g",
            fats: "18g",
          },
          prepTime: "35 minutes",
        },
      },
      tips: [
        "Take a 10-minute walk after lunch to aid digestion",
        "Create a motivating playlist for your workouts",
        "Limit screen time 1 hour before bed",
        "Try adding lemon to your water for extra flavor and vitamin C",
      ],
      notes: "Day 2: Focus on form over speed. Quality movements matter more than quantity.",
    },
    // Days 3-7 would follow the same pattern...
    {
      day: 3,
      tips: [
        "Rest day! Focus on gentle stretching and recovery",
        "Consider taking a relaxing bath with Epsom salts",
        "Spend time reading or engaging in a hobby you enjoy",
        "Meal prep for the upcoming days",
      ],
      notes: "Day 3: Active recovery. Listen to your body and give it the rest it needs.",
    },
    {
      day: 4,
      tips: [
        "Increase intensity slightly from Day 1",
        "Monitor hydration - drink water consistently",
        "Review your progress and adjust goals if needed",
        "Practice gratitude meditation for 5 minutes",
      ],
      notes: "Day 4: Building momentum. You're establishing healthy habits!",
    },
    {
      day: 5,
      tips: [
        "Challenge yourself with one more rep or longer holds",
        "Focus on incorporating healthy fats into meals",
        "Share your progress with a friend or family member",
        "Write down three things you're grateful for today",
      ],
      notes: "Day 5: Halfway point! Celebrate your consistency.",
    },
    {
      day: 6,
      tips: [
        "Try a morning yoga session to energize your day",
        "Get creative with your meals - try a new recipe",
        "Invite a friend to join you for a workout",
        "Practice evening relaxation techniques",
      ],
      notes: "Day 6: Almost there! Keep pushing forward.",
    },
    {
      day: 7,
      tips: [
        "Reflect on the week's achievements",
        "Assess what worked well and what to improve",
        "Set goals for the upcoming week",
        "Treat yourself to something special - you earned it!",
        "Take progress photos or measurements",
      ],
      notes: "Day 7: Congratulations on completing your first week! This is just the beginning of your wellness journey.",
    },
  ],
};

const FEATURES = [
  { icon: CalendarDays, title: "Day by day", body: "Pick a day from the list, or step through with the previous and next buttons or the arrow keys." },
  { icon: ListChecks, title: "Clear instructions", body: "Yoga, training and meals in their own sections, with numbered steps, sets, reps and timings." },
  { icon: BookOpen, title: "Recipes on demand", body: "Each meal shows calories and macros; open the recipe for ingredients and method." },
  { icon: Download, title: "PDF export", body: "Download the whole plan, one day, or any days you choose. Each day starts on a new page." },
  { icon: Printer, title: "Print friendly", body: "Printing hides the app and prints every day on its own page, black on white." },
  { icon: Smartphone, title: "Works on any screen", body: "Swipe through days on a phone; on a laptop the day list stays beside the plan." },
];

export default function PlanDemoPage() {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return <PlanNotebook data={samplePlan} onClose={() => setShowDemo(false)} />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Sample"
        title="Plan viewer"
        description="See how a plan reads before you create your own. This sample is a 7-day yoga, diet and fitness plan."
        actions={
          <Button type="button" onClick={() => setShowDemo(true)}>
            <BookOpen aria-hidden />
            View sample plan
          </Button>
        }
      />
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="demo-features">
        <h2 id="demo-features" className="text-base font-semibold text-gray-900">
          What you get
        </h2>
        <ul className="mt-5 grid gap-5 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="mt-0.5 text-sm text-gray-600">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t border-gray-100 pt-5">
          <Button type="button" onClick={() => setShowDemo(true)}>
            View sample plan
          </Button>
        </div>
      </section>
    </div>
  );
}
