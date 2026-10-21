import { createI18n } from "vue-i18n";
import en from "./en.json";
import lt from "./lt.json";
const userLocale = navigator.language.split("-")[0];
export default createI18n({
	locale: userLocale,
	fallbackLocale: "en",
	messages: { en, lt },
});
