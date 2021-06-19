import "jsdom-global/register";
import { Crypto } from "@peculiar/webcrypto";

global.devicePixelRatio = window.devicePixelRatio;
global.crypto = new Crypto();
