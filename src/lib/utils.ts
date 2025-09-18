import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export type Debounced = {(...args: unknown[]): any, cancel: ()=> void};
export function debounce(func: (...args: unknown[]) => unknown, _timeout: number): Debounced;
export function debounce(func: (...args: unknown[]) => unknown, _timeout: () => number): Debounced;
export function debounce(func: any, _timeout: () => number) {
    let timeout = 300;
    let timer: number;

    let f: Debounced = Object.assign(
        (...args: unknown[]) => {
            if (typeof _timeout === 'function') {
                timeout = _timeout();
                //console.log(_timeout());
            } else if (typeof _timeout === 'number') {
                timeout = _timeout;
            }
            
            clearTimeout(timer);
            timer = setTimeout(() => {
                func.apply(this, args);
            }, timeout);
        },
        { 
            cancel: () => {clearTimeout(timer)} 
        }
    );
    return f;
}
