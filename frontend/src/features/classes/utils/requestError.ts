import { ApiError } from "../../../lib/api/client";

export interface DisplayError {
  title: string;
  description: string;
  isNetworkError: boolean;
  isConflict: boolean;
}

export function toDisplayError(error: unknown, action: "classes" | "details" | "hold"): DisplayError {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return {
        title: "অনুরোধের তথ্য যাচাই করুন",
        description: "ভর্তি সেবা অনুরোধটি গ্রহণ করতে পারেনি। ১৭ সংখ্যার শিক্ষার্থী আইডি দেখে আবার চেষ্টা করুন।",
        isNetworkError: false,
        isConflict: false
      };
    }

    if (error.status === 404) {
      return {
        title: action === "classes" ? "শ্রেণির তথ্য পাওয়া যায়নি" : "এই শ্রেণিটি আর পাওয়া যাচ্ছে না",
        description: "শ্রেণিটি পরিবর্তিত হতে পারে। সর্বশেষ আসনের তথ্য দেখতে আবার হালনাগাদ করুন।",
        isNetworkError: false,
        isConflict: false
      };
    }

    if (error.status === 409) {
      return {
        title: "আসন সংরক্ষণ করা যায়নি",
        description: "শ্রেণির আসন পূর্ণ হতে পারে বা এই শিক্ষার্থী আইডিতে আগে থেকেই সক্রিয়/নিশ্চিত সংরক্ষণ আছে। আবার চেষ্টা করার আগে আসনের তথ্য হালনাগাদ করুন।",
        isNetworkError: false,
        isConflict: true
      };
    }
  }

  return {
    title: action === "hold" ? "সংরক্ষণের ফল নিশ্চিত করা যায়নি" : "ভর্তি সেবার সঙ্গে সংযোগ করা যাচ্ছে না",
    description: action === "hold"
      ? "ফল পাওয়ার আগে সংযোগ বিচ্ছিন্ন হয়েছে। আসন সংরক্ষিত হয়ে থাকতে পারে; স্বয়ংক্রিয়ভাবে আবার চেষ্টা করবেন না। একই শিক্ষার্থী আইডি দিয়ে আমার আবেদন দেখুন।"
      : "ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
    isNetworkError: true,
    isConflict: false
  };
}
