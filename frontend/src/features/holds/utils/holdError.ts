import { ApiError } from "../../../lib/api/client";

export interface HoldDisplayError {
  title: string;
  description: string;
  isNetworkError: boolean;
  shouldRefresh: boolean;
}

export function toHoldDisplayError(error: unknown, operation: "history" | "confirm" | "cancel"): HoldDisplayError {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return { title: "অনুরোধের তথ্য যাচাই করুন", description: "ভর্তি সেবা অনুরোধটি গ্রহণ করতে পারেনি। শিক্ষার্থী আইডি দেখে আবার চেষ্টা করুন।", isNetworkError: false, shouldRefresh: false };
    }
    if (error.status === 403) {
      return { title: "এই সংরক্ষণটি অন্য শিক্ষার্থীর", description: "দেওয়া শিক্ষার্থী আইডিটি এই সংরক্ষণের মালিক নয়।", isNetworkError: false, shouldRefresh: false };
    }
    if (error.status === 404) {
      return { title: "সংরক্ষণের তথ্য পাওয়া যায়নি", description: "এই সংরক্ষণটি আর নাও থাকতে পারে। সর্বশেষ অবস্থা দেখতে তালিকা হালনাগাদ করুন।", isNetworkError: false, shouldRefresh: true };
    }
    if (error.status === 409) {
      return {
        title: operation === "confirm" ? "এই সংরক্ষণে ভর্তি নিশ্চিত করা যাবে না" : "এই সংরক্ষণ বাতিল করা যাবে না",
        description: operation === "confirm" ? "সংরক্ষণের সময় শেষ বা এটি বাতিল হয়ে থাকতে পারে। সর্বশেষ অবস্থা দেখতে তালিকা হালনাগাদ করুন।" : "সংরক্ষণের সময় শেষ বা ভর্তি নিশ্চিত হয়ে থাকতে পারে। সর্বশেষ অবস্থা দেখতে তালিকা হালনাগাদ করুন।",
        isNetworkError: false,
        shouldRefresh: true
      };
    }
  }

  return {
    title: operation === "history" ? "আবেদনের তালিকা লোড করা যাচ্ছে না" : "অনুরোধের ফল নিশ্চিত করা যায়নি",
    description: operation === "history" ? "ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।" : "অনুরোধ পাঠানোর পরে সংযোগ বিচ্ছিন্ন হয়েছে, তাই এটি সফল হয়ে থাকতে পারে। স্বয়ংক্রিয়ভাবে আবার চেষ্টা না করে সর্বশেষ অবস্থা দেখুন।",
    isNetworkError: true,
    shouldRefresh: false
  };
}
