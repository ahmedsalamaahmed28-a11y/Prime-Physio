"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LibraryItem {
  id: string;
  type: "nutrition" | "exercise" | "device";
  subType?: "breakfast" | "lunch" | "dinner" | "snacks";
  category?: "الرأس" | "الرقبة" | "الجزع" | "الطرف العلوي" | "الطرف السفلي";
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
}

const DEFAULT_TEMPLATES: LibraryItem[] = [
  {
    id: "t-bf-1",
    type: "nutrition",
    subType: "breakfast",
    titleAr: "إفطار عالي البروتين (بيضاة وشوفان)",
    titleEn: "High Protein Eggs & Oats Breakfast",
    contentAr: "٣ بيضات مسلوقة + كوب شوفان بالحليب منزوع الدسم مع بذور الشيا والموز.",
    contentEn: "3 boiled eggs + 1 cup oatmeal with skimmed milk, chia seeds, and banana slice.",
  },
  {
    id: "t-bf-2",
    type: "nutrition",
    subType: "breakfast",
    titleAr: "إفطار كيتو دهون صحية",
    titleEn: "Keto Friendly Healthy Fats Breakfast",
    contentAr: "أومليت بيضتين مقلي بزيت جوز الهند مع نصف حبة أفوكادو وطبق جرجير.",
    contentEn: "2 egg omelette cooked in coconut oil + half avocado + fresh arugula salad.",
  },
  {
    id: "t-bf-3",
    type: "nutrition",
    subType: "breakfast",
    titleAr: "توست أسمر بزبدة الفول السوداني",
    titleEn: "Whole Wheat Toast with Peanut Butter",
    contentAr: "شريحتين توست أسمر مع ملعقتين زبدة فول سوداني خالية من السكر المضاف وشرائح تفاح.",
    contentEn: "2 slices of whole wheat toast + 2 tbsp sugar-free peanut butter + apple slices.",
  },
  {
    id: "t-bf-4",
    type: "nutrition",
    subType: "breakfast",
    titleAr: "بانكيك صحي بالشوفان",
    titleEn: "Healthy Oat Pancakes",
    contentAr: "٣ قطع بانكيك مصنوعة من دقيق الشوفان والموز مع ملعقة عسل نحل للتحلية.",
    contentEn: "3 oat and banana pancakes topped with 1 tsp of honey.",
  },
  {
    id: "t-ln-1",
    type: "nutrition",
    subType: "lunch",
    titleAr: "غداء سالمون مشوي متكامل",
    titleEn: "Grilled Salmon Recovery Lunch",
    contentAr: "٢٠٠ جرام سالمون مشوي + كوب بطاطا حلوة مهروسة + هليون وبروكلي مشوي.",
    contentEn: "200g grilled salmon + 1 cup mashed sweet potato + grilled asparagus and broccoli.",
  },
  {
    id: "t-ln-2",
    type: "nutrition",
    subType: "lunch",
    titleAr: "غداء صدور دجاج وأرز بني",
    titleEn: "Lean Chicken & Brown Rice Lunch",
    contentAr: "٢٠٠ جرام صدور دجاج مشوية + ٦ ملاعق أرز بني + سلطة خضراء بزيت الزيتون.",
    contentEn: "200g grilled chicken breast + 6 tbsp brown rice + mixed green salad with olive oil.",
  },
  {
    id: "t-ln-3",
    type: "nutrition",
    subType: "lunch",
    titleAr: "مكرونة بالقمح الكامل واللحم المفروم",
    titleEn: "Whole Wheat Pasta with Minced Meat",
    contentAr: "كوب مكرونة مسلوقة بالقمح الكامل + ١٥٠ جرام لحم بقري مفروم خالي من الدهون بصلصة الطماطم.",
    contentEn: "1 cup whole wheat pasta + 150g lean minced beef in tomato sauce.",
  },
  {
    id: "t-ln-4",
    type: "nutrition",
    subType: "lunch",
    titleAr: "طبق كينوا بالخضار والدجاج المشوي",
    titleEn: "Quinoa Bowl with Veggies and Grilled Chicken",
    contentAr: "نصف كوب كينوا مطبوخة + خضار سوتيه (كوسة، فلفل ألوان) + ١٥٠ جرام دجاج مقطع.",
    contentEn: "1/2 cup cooked quinoa + sauteed vegetables (zucchini, bell peppers) + 150g diced chicken.",
  },
  {
    id: "t-dn-1",
    type: "nutrition",
    subType: "dinner",
    titleAr: "عشاء خفيف تونة يوناني",
    titleEn: "Light Greek Tuna Dinner",
    contentAr: "علبة تونة مصفاة + خيار وطماطم وخس + علبة زبادي يوناني بنكهة الثوم والليمون.",
    contentEn: "1 can drained tuna + cucumbers, tomatoes, lettuce + 1 cup Greek yogurt with garlic & lemon.",
  },
  {
    id: "t-dn-2",
    type: "nutrition",
    subType: "dinner",
    titleAr: "جبنة قريش وتوت عشاء صحي",
    titleEn: "Cottage Cheese & Berries Sleep Support",
    contentAr: "١٥٠ جرام جبنة قريش قليلة الدسم + حفنة من التوت المشكل + ملعقة صغيرة عسل خام.",
    contentEn: "150g low-fat cottage cheese + a handful of mixed berries + 1 tsp raw honey.",
  },
  {
    id: "t-dn-3",
    type: "nutrition",
    subType: "dinner",
    titleAr: "سلطة الحلوم المشوي",
    titleEn: "Grilled Halloumi Salad",
    contentAr: "٤ شرائح جبن حلوم مشوي + جرجير وخس وفجل + تتبيلة زيت زيتون وليمون خفيفة.",
    contentEn: "4 slices grilled halloumi cheese + arugula, lettuce, radish + light olive oil and lemon dressing.",
  },
  {
    id: "t-dn-4",
    type: "nutrition",
    subType: "dinner",
    titleAr: "شوربة عدس مع خبز محمص",
    titleEn: "Lentil Soup with Croutons",
    contentAr: "طبق متوسط من شوربة العدس الأصفر + شريحة توست أسمر محمص مقطع مكعبات.",
    contentEn: "Medium bowl of yellow lentil soup + 1 slice of toasted whole wheat bread cut into croutons.",
  },
  {
    id: "t-sn-1",
    type: "nutrition",
    subType: "snacks",
    titleAr: "مكسرات وتفاح وجبة خفيفة",
    titleEn: "Raw Nuts & Apple Energy Boost",
    contentAr: "٣٠ جرام مكسرات لوز وجوز غير مملحة + حبة تفاحة خضراء مقطعة.",
    contentEn: "30g unsalted raw almonds & walnuts + 1 sliced green apple.",
  },
  {
    id: "t-sn-2",
    type: "nutrition",
    subType: "snacks",
    titleAr: "بروتين شيك وموز استشفاء",
    titleEn: "Protein Shake & Banana Workout recovery",
    contentAr: "سكوب واي بروتين مخلوط بالماء + ثمرة موز متوسطة الحجم.",
    contentEn: "1 scoop whey protein mixed with water + 1 medium banana.",
  },
  {
    id: "t-sn-3",
    type: "nutrition",
    subType: "snacks",
    titleAr: "زبادي يوناني سادة مع فواكه",
    titleEn: "Plain Greek Yogurt with Fruits",
    contentAr: "علبة زبادي يوناني سادة خالي الدسم + قطع فراولة وكيوي.",
    contentEn: "1 cup fat-free plain Greek yogurt + sliced strawberries and kiwi.",
  },
  {
    id: "t-sn-4",
    type: "nutrition",
    subType: "snacks",
    titleAr: "حمص مع أصابع الجزر والخيار",
    titleEn: "Hummus with Carrots and Cucumber",
    contentAr: "٣ ملاعق كبيرة من الحمص المنزلي + أصابع من الجزر الطازج والخيار للتغميس.",
    contentEn: "3 tbsp homemade hummus + fresh carrot and cucumber sticks for dipping.",
  },
  {
    id: "t-ex-1",
    type: "exercise",
    category: "الجزع",
    titleAr: "تمرين بلانك ثبات الجذع",
    titleEn: "Core Plank Stabilization Exercise",
    contentAr: "تمرين بلانك لمدة ٣٠ ثانية لـ ٣ مجموعات مع التركيز على شد عضلات البطن.",
    contentEn: "30-second plank for 3 sets focusing on deep abdominal engagement.",
  },
  {
    id: "t-ex-2",
    type: "exercise",
    category: "الجزع",
    titleAr: "تمرين تمدد ماكنزي للظهر",
    titleEn: "McKenzie Lumbar Extension Stretch",
    contentAr: "تمديد العمود الفقري برفع الصدر للأعلى والاستلقاء على البطن لـ ١٠ تكرارات.",
    contentEn: "Prone press-up extension for 10 reps focusing on lower back mobilization.",
  },
  {
    id: "t-ex-3",
    type: "exercise",
    category: "الرقبة",
    titleAr: "تمرين إطالة وتأهيل الرقبة (Chin Tuck)",
    titleEn: "Cervical Retraction (Chin Tuck)",
    contentAr: "سحب الرأس موازياً للخلف دون خفض الرأس لتقوية عضلات الرقبة العميقة.",
    contentEn: "Pull head straight back, keeping eyes level, to activate deep neck flexors.",
  },
  {
    id: "t-ex-4",
    type: "exercise",
    category: "الطرف السفلي",
    titleAr: "تمرين الجسر لتقوية الأرداف",
    titleEn: "Glute Bridge Lower Limb Strength",
    contentAr: "الاستلقاء على الظهر مع ثني الركبتين ورفع الحوض لأعلى لـ ٣ مجموعات.",
    contentEn: "Lie on back with knees bent and lift hips towards the ceiling for 3 sets.",
  },
  {
    id: "t-dev-1",
    type: "device",
    titleAr: "جهاز التحفيز الكهربائي (TENS)",
    titleEn: "TENS Electrical Stimulation",
    contentAr: "استخدام جهاز TENS لتخفيف الألم عن طريق تحفيز الأعصاب الحسية لمدة ٢٠ دقيقة. يمكن استخدامه للآلام الحادة والمزمنة.",
    contentEn: "Use TENS machine for pain relief by stimulating sensory nerves for 20 minutes. Used for both acute and chronic pain.",
  },
  {
    id: "t-dev-2",
    type: "device",
    titleAr: "الموجات فوق الصوتية (Ultrasound)",
    titleEn: "Therapeutic Ultrasound",
    contentAr: "استخدام الموجات فوق الصوتية العلاجية لتقليل الالتهاب وتحفيز التئام الأنسجة العميقة لمدة ١٠ دقائق. مناسب لإصابات الأوتار والعضلات.",
    contentEn: "Apply therapeutic ultrasound to reduce inflammation and promote deep tissue healing for 10 minutes. Suitable for tendon and muscle injuries.",
  },
  {
    id: "t-dev-3",
    type: "device",
    titleAr: "الكمادات الحرارية (Hot Packs)",
    titleEn: "Hot Packs Therapy",
    contentAr: "وضع كمادات حرارية لمدة ١٥-٢٠ دقيقة على المنطقة المصابة لزيادة تدفق الدم وتقليل التشنج العضلي قبل البدء بالتمارين.",
    contentEn: "Apply hot packs for 15-20 minutes on the affected area to increase blood flow and reduce muscle spasms before starting exercises.",
  },
  {
    id: "t-dev-4",
    type: "device",
    titleAr: "جهاز الشد الفقري (Traction)",
    titleEn: "Spinal Traction",
    contentAr: "تطبيق الشد الفقري للرقبة أو أسفل الظهر لتخفيف الضغط على جذور الأعصاب وتقليل الألم الناجم عن الانزلاق الغضروفي. يستخدم لـ ١٥-٢٠ دقيقة بوزن متدرج حسب توجيهات الأخصائي.",
    contentEn: "Apply spinal traction to the neck or lower back to relieve pressure on nerve roots and reduce pain from herniated discs. Used for 15-20 minutes with graded weight.",
  },
];

export default function ClinicalLibraryPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [mainTab, setMainTab] = useState<"nutrition" | "exercise" | "device">("nutrition");
  const [nutritionTab, setNutritionTab] = useState<"breakfast" | "lunch" | "dinner" | "snacks">("breakfast");
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [contentAr, setContentAr] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState<LibraryItem["category"]>("الرقبة");

  useEffect(() => {
    async function loadTemplates() {
      const { data, error } = await supabase
        .from("treatment_templates")
        .select("*")
        .eq("kind", "clinical_library")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load clinical templates from Supabase", error);
        setItems([]);
        return;
      }

      if (!data || data.length === 0) {
        const seedRows = DEFAULT_TEMPLATES.map((item) => ({
          id: item.id,
          kind: "clinical_library",
          payload: item,
        }));
        const { error: seedError } = await supabase.from("treatment_templates").upsert(seedRows);
        if (seedError) {
          console.error("Failed to seed clinical templates", seedError);
          setItems([]);
          return;
        }
        setItems(DEFAULT_TEMPLATES);
        return;
      }

      setItems(data.map((row: { payload: LibraryItem }) => row.payload));
    }

    loadTemplates();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr || !contentAr) {
      alert(isRtl ? "الرجاء تعبئة العنوان والمحتوى باللغة العربية كحد أدنى." : "Please fill in at least Arabic title and content.");
      return;
    }

    const newItem: LibraryItem = {
      id: `custom-${Date.now()}`,
      type: mainTab,
      subType: mainTab === "nutrition" ? nutritionTab : undefined,
      category: mainTab === "exercise" ? exerciseCategory : undefined,
      titleAr,
      titleEn: titleEn || titleAr,
      contentAr,
      contentEn: contentEn || contentAr,
    };

    const { error } = await supabase.from("treatment_templates").insert({
      id: newItem.id,
      kind: "clinical_library",
      payload: newItem,
    });
    if (error) {
      console.error("Failed to save clinical template to Supabase", error);
      alert(isRtl ? "فشل حفظ القالب" : "Failed to save template");
      return;
    }
    setItems([newItem, ...items]);

    setTitleAr("");
    setTitleEn("");
    setContentAr("");
    setContentEn("");
  };

  const handleDeleteItemClick = (id: string) => {
    setDeleteTemplateId(id);
  };

  const executeDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    const { error } = await supabase.from("treatment_templates").delete().eq("id", deleteTemplateId);
    if (error) {
      console.error("Failed to delete clinical template from Supabase", error);
      alert(isRtl ? "فشل حذف القالب" : "Failed to delete template");
      return;
    }
    setItems(items.filter((item) => item.id !== deleteTemplateId));
    setDeleteTemplateId(null);
  };

  const getFilteredItems = () => {
    return items.filter((item) => {
      if (item.type !== mainTab) return false;
      if (mainTab === "nutrition" && item.subType !== nutritionTab) return false;
      return true;
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#0d8a8a]">
          {isRtl ? "المكتبة القوالبية العلاجية" : "Clinical Templates Library"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isRtl
            ? "قم بإعداد وتخزين الوجبات السريعة، التمارين، والأجهزة العلاجية مسبقاً لتتمكن من اختيارها بضغطة زر داخل الجلسات."
            : "Define pre-set diet recipes, physical therapy exercises, and device modalities to quickly select them in specialized clinic views."}
        </p>
      </div>

      <div className="space-y-4">
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/60 p-1">
            <TabsTrigger value="nutrition" className="text-xs font-bold">
              {isRtl ? "تغذية علاجية 🍏" : "Clinical Nutrition 🍏"}
            </TabsTrigger>
            <TabsTrigger value="exercise" className="text-xs font-bold">
              {isRtl ? "تمارين 🏋️" : "Exercises 🏋️"}
            </TabsTrigger>
            <TabsTrigger value="device" className="text-xs font-bold">
              {isRtl ? "أجهزة علاجية ⚡" : "Modalities ⚡"}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mainTab === "nutrition" && (
          <Tabs value={nutritionTab} onValueChange={(v) => setNutritionTab(v as typeof nutritionTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-teal-50/50 p-1">
              <TabsTrigger value="breakfast" className="text-xs">{isRtl ? "إفطار" : "Breakfast"}</TabsTrigger>
              <TabsTrigger value="lunch" className="text-xs">{isRtl ? "غداء" : "Lunch"}</TabsTrigger>
              <TabsTrigger value="dinner" className="text-xs">{isRtl ? "عشاء" : "Dinner"}</TabsTrigger>
              <TabsTrigger value="snacks" className="text-xs">{isRtl ? "سناكس" : "Snacks"}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          <Card className="lg:col-span-5 border-teal-150 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-white">
                {isRtl ? "إضافة قالب جديد" : "Add New Template"}
              </CardTitle>
              <CardDescription className="text-[10px]">
                {isRtl ? "سيتم تخزين القالب الجديد تحت التصنيف المحدد أعلاه" : "The template will be saved under the tab selected above"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddItem} className="space-y-4">
                {mainTab === "exercise" && (
                  <div className="space-y-1">
                    <Label htmlFor="exerciseCategory" className="text-xs">
                      {isRtl ? "تصنيف منطقة الجسم (Category) *" : "Anatomical Category *"}
                    </Label>
                    <select
                      id="exerciseCategory"
                      value={exerciseCategory}
                      onChange={(e) => setExerciseCategory(e.target.value as LibraryItem["category"])}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    >
                      <option value="الرأس">{isRtl ? "الرأس" : "Head"}</option>
                      <option value="الرقبة">{isRtl ? "الرقبة" : "Neck"}</option>
                      <option value="الجزع">{isRtl ? "الجزع" : "Trunk"}</option>
                      <option value="الطرف العلوي">{isRtl ? "الطرف العلوي" : "Upper Limb"}</option>
                      <option value="الطرف السفلي">{isRtl ? "الطرف السفلي" : "Lower Limb"}</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="titleAr" className="text-xs">{isRtl ? "العنوان بالعربية *" : "Title (Arabic) *"}</Label>
                  <Input
                    id="titleAr"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder={
                      mainTab === "exercise"
                        ? isRtl ? "تمرين استطالة الظهر" : "e.g. Back stretching exercise"
                        : mainTab === "device"
                          ? isRtl ? "جهاز تحفيز كهربائي" : "e.g. TENS Machine"
                          : isRtl ? "مثال: شوفان بالتوت وزبدة الفول" : "e.g. Oatmeal with berries and peanut butter"
                    }
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="titleEn" className="text-xs">
                    {isRtl ? "العنوان بالإنجليزية (اختياري)" : "Title (English - Optional)"}
                  </Label>
                  <Input
                    id="titleEn"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder={
                      mainTab === "exercise" ? "Lumbar Stretch"
                        : mainTab === "device" ? "TENS Machine"
                          : "e.g. Berry Peanut Butter Oatmeal"
                    }
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="contentAr" className="text-xs">
                    {isRtl ? "الوصف والتفاصيل (عربي) *" : "Description (Arabic) *"}
                  </Label>
                  <Textarea
                    id="contentAr"
                    value={contentAr}
                    onChange={(e) => setContentAr(e.target.value)}
                    placeholder={
                      mainTab === "exercise"
                        ? isRtl ? "اكتب طريقة أداء التمرين وعدد المرات..." : "Write execution instructions and reps..."
                        : mainTab === "device"
                          ? isRtl ? "اكتب إعدادات الجهاز وفترة الاستخدام..." : "Write device settings and duration..."
                          : isRtl ? "اكتب تفاصيل المكونات والسعرات..." : "Write ingredients details..."
                    }
                    rows={3}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="contentEn" className="text-xs">
                    {isRtl ? "الوصف والتفاصيل (إنجليزي - اختياري)" : "Description (English - Optional)"}
                  </Label>
                  <Textarea
                    id="contentEn"
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                    placeholder="Write description in English..."
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs py-2">
                  ➕ {isRtl ? "إضافة إلى المكتبة" : "Save to Library"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isRtl
                ? `النماذج المسجلة للتبويب الحالي (${getFilteredItems().length})`
                : `Registered templates for this tab (${getFilteredItems().length})`}
            </h3>

            {getFilteredItems().length === 0 ? (
              <div className="text-center py-20 border border-dashed rounded-2xl text-slate-400 text-xs bg-muted/20">
                {isRtl ? "لا توجد قوالب مخصصة مسجلة حالياً في هذا القسم." : "No templates saved in this category yet."}
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {getFilteredItems().map((item) => (
                  <Card key={item.id} className="border-slate-100 hover:shadow-xs transition-shadow">
                    <CardContent className="p-4 flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="font-bold text-xs text-slate-800 dark:text-white">
                            {isRtl ? item.titleAr : item.titleEn}
                          </h4>
                          <span className="text-[9px] text-[#0d8a8a] bg-teal-50 dark:bg-teal-950/20 px-2 py-0.5 rounded-full border border-teal-100/50">
                            {item.type.toUpperCase()}
                          </span>
                          {item.subType && (
                            <span className="text-[9px] text-amber-700 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-100/50">
                              {item.subType}
                            </span>
                          )}
                          {item.category && (
                            <span className="text-[9px] text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full border border-indigo-100/50">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-sans">
                          {isRtl ? item.contentAr : item.contentEn}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 rounded-full p-0 shrink-0"
                        onClick={() => handleDeleteItemClick(item.id)}
                      >
                        ❌
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <DialogContent className="sm:max-w-sm text-center" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center space-y-4 pt-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-2">
              <Trash2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800">
              {isRtl ? "تأكيد الحذف" : "Confirm Deletion"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {isRtl
                ? "هل أنت متأكد من حذف هذا القالب نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
                : "Are you sure you want to permanently delete this template? This action cannot be undone."}
            </DialogDescription>
          </div>
          <div className={`mt-6 flex gap-3 w-full ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            <Button type="button" variant="outline" onClick={() => setDeleteTemplateId(null)} className="flex-1 rounded-xl font-bold">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="button" onClick={executeDeleteTemplate} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
              {isRtl ? "نعم، احذف القالب" : "Yes, Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
