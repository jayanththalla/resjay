// ResumeForge AI – Content Script
// Deep form scanner & intelligent autofill for job application pages
// Injected on any page the user activates autofill on

(() => {
    const LOG_PREFIX = '[ResumeForge]';

    console.log(`${LOG_PREFIX} Content script loaded on:`, window.location.href);

    // ─── Listen for messages from extension ──────────────────
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        try {
            switch (message.action) {
                case 'SCAN_FIELDS':
                    sendResponse({ success: true, fields: scanFormFields() });
                    break;

                case 'FILL_FIELDS':
                    fillFormFields(message.data || []);
                    sendResponse({ success: true });
                    break;

                case 'FILL_SINGLE_FIELD':
                    fillSingleField(message.fieldId, message.value);
                    sendResponse({ success: true });
                    break;

                case 'HIGHLIGHT_FIELDS':
                    highlightFields(message.fieldIds || []);
                    sendResponse({ success: true });
                    break;

                case 'EXTRACT_JOB_INFO':
                    sendResponse({ success: true, data: extractJobInfo() });
                    break;

                case 'PING':
                    sendResponse({ success: true, ready: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error: any) {
            console.error(`${LOG_PREFIX} Error handling ${message.action}:`, error);
            sendResponse({ success: false, error: error.message });
        }

        return true; // Keep channel open for async
    });

    // ─── Form Field Scanner ─────────────────────────────────
    function scanFormFields(): any[] {
        const fields: any[] = [];
        const seen = new Set<Element>();
        let counter = 0;

        // Find all form elements across the page
        const allInputs = document.querySelectorAll(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), ' +
            'textarea, ' +
            'select'
        );

        for (const el of allInputs) {
            if (seen.has(el)) continue;
            seen.add(el);

            const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

            // Skip invisible/disabled elements
            const style = getComputedStyle(input);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                continue;
            }
            if (input.disabled || (input as HTMLInputElement).readOnly) continue;

            // Skip very small elements (likely hidden)
            const rect = input.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) continue;

            const label = resolveLabel(input);
            const fieldId = `rf-field-${counter++}`;

            // Tag the element for later identification
            input.setAttribute('data-rf-field-id', fieldId);

            const fieldData: any = {
                id: fieldId,
                elementId: input.id || '',
                elementName: input.name || '',
                tagName: input.tagName.toLowerCase(),
                inputType: (input as HTMLInputElement).type || '',
                label: label,
                placeholder: (input as HTMLInputElement).placeholder || '',
                required: input.required || input.getAttribute('aria-required') === 'true',
                currentValue: input.value || '',
                xpath: getXPath(input),
            };

            // Get options for select elements
            if (input.tagName === 'SELECT') {
                const select = input as HTMLSelectElement;
                fieldData.options = Array.from(select.options).map((opt) => opt.text.trim());
            }

            fields.push(fieldData);
        }

        console.log(`${LOG_PREFIX} Scanned ${fields.length} form fields`);
        return fields;
    }

    // ─── Label Resolver ─────────────────────────────────────
    // Tries multiple strategies to find the label text for a form element
    function resolveLabel(el: HTMLElement): string {
        // 1. <label for="id"> — explicit association
        if (el.id) {
            const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (label?.textContent?.trim()) {
                return cleanLabel(label.textContent);
            }
        }

        // 2. Wrapping <label> element
        const parentLabel = el.closest('label');
        if (parentLabel) {
            // Get label text, excluding the input's own text
            const clone = parentLabel.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('input, textarea, select').forEach((child) => child.remove());
            const text = clone.textContent?.trim();
            if (text) return cleanLabel(text);
        }

        // 3. aria-label attribute
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel?.trim()) return cleanLabel(ariaLabel);

        // 4. aria-labelledby
        const labelledBy = el.getAttribute('aria-labelledby');
        if (labelledBy) {
            const ids = labelledBy.split(/\s+/);
            const texts = ids.map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean);
            if (texts.length) return cleanLabel(texts.join(' '));
        }

        // 5. Placeholder text
        const placeholder = (el as HTMLInputElement).placeholder;
        if (placeholder?.trim()) return cleanLabel(placeholder);

        // 6. Nearby text: preceding sibling, parent's text, fieldset legend
        const nearby = findNearbyText(el);
        if (nearby) return cleanLabel(nearby);

        // 7. title attribute
        const title = el.getAttribute('title');
        if (title?.trim()) return cleanLabel(title);

        // 8. name/id as fallback (humanize)
        const name = el.getAttribute('name') || el.id;
        if (name) {
            return cleanLabel(
                name
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/[_\-\[\]]/g, ' ')
                    .trim()
            );
        }

        return '';
    }

    function findNearbyText(el: HTMLElement): string | null {
        // Check previous sibling
        let sibling = el.previousElementSibling;
        if (sibling && isTextNode(sibling)) {
            return sibling.textContent?.trim() || null;
        }

        // Check parent's direct text (works for <div><span>Label</span><input/></div>)
        const parent = el.parentElement;
        if (parent) {
            // Look for span/label/div siblings
            for (const child of parent.children) {
                if (child === el) continue;
                if (['SPAN', 'LABEL', 'DIV', 'P', 'STRONG', 'B'].includes(child.tagName)) {
                    const text = child.textContent?.trim();
                    if (text && text.length < 100) return text;
                }
            }

            // Check if parent has direct text nodes
            for (const node of parent.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent?.trim();
                    if (text && text.length > 2 && text.length < 100) return text;
                }
            }
        }

        // Check fieldset > legend
        const fieldset = el.closest('fieldset');
        if (fieldset) {
            const legend = fieldset.querySelector('legend');
            if (legend?.textContent?.trim()) return legend.textContent.trim();
        }

        // Walk up to grandparent
        const grandparent = parent?.parentElement;
        if (grandparent) {
            for (const child of grandparent.children) {
                if (child.contains(el)) continue;
                if (['LABEL', 'SPAN', 'DIV', 'H3', 'H4', 'P'].includes(child.tagName)) {
                    const text = child.textContent?.trim();
                    if (text && text.length < 100) return text;
                }
            }
        }

        return null;
    }

    function isTextNode(el: Element): boolean {
        const textTags = ['LABEL', 'SPAN', 'DIV', 'P', 'STRONG', 'B', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LEGEND'];
        return textTags.includes(el.tagName) && (el.textContent?.trim().length || 0) > 0;
    }

    function cleanLabel(text: string): string {
        return text
            .replace(/\s+/g, ' ')
            .replace(/\*$/, '')  // remove required asterisk
            .replace(/^\*/, '')
            .replace(/[:\s]*$/, '')
            .trim();
    }

    // ─── Fill Form Fields ───────────────────────────────────
    function fillFormFields(fieldData: Array<{ id: string; value: string }>) {
        let filled = 0;
        let failed = 0;

        for (const { id, value } of fieldData) {
            if (!value) continue;

            try {
                const el = document.querySelector(`[data-rf-field-id="${id}"]`) as HTMLElement;
                if (!el) {
                    console.warn(`${LOG_PREFIX} Field not found: ${id}`);
                    failed++;
                    continue;
                }

                setFieldValue(el as HTMLInputElement, value);
                flashBorder(el, 'success');
                filled++;
            } catch (error) {
                console.error(`${LOG_PREFIX} Failed to fill ${id}:`, error);
                flashBorder(
                    document.querySelector(`[data-rf-field-id="${id}"]`) as HTMLElement,
                    'error'
                );
                failed++;
            }
        }

        console.log(`${LOG_PREFIX} Filled ${filled} fields, ${failed} failed`);
    }

    function fillSingleField(fieldId: string, value: string) {
        const el = document.querySelector(`[data-rf-field-id="${fieldId}"]`) as HTMLElement;
        if (!el) throw new Error(`Field ${fieldId} not found`);
        setFieldValue(el as HTMLInputElement, value);
        flashBorder(el, 'success');
    }

    // ─── Smart Value Setter ─────────────────────────────────
    // Handles React controlled components, native inputs, and selects
    function setFieldValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
        const tagName = el.tagName.toLowerCase();
        const inputType = (el as HTMLInputElement).type?.toLowerCase();

        // Handle select elements
        if (tagName === 'select') {
            const select = el as HTMLSelectElement;
            const option = Array.from(select.options).find(
                (opt) => opt.value.toLowerCase() === value.toLowerCase() ||
                    opt.text.toLowerCase().includes(value.toLowerCase())
            );
            if (option) {
                select.value = option.value;
            } else {
                select.value = value;
            }
            triggerEvents(select);
            return;
        }

        // Handle checkbox/radio
        if (inputType === 'checkbox' || inputType === 'radio') {
            const inp = el as HTMLInputElement;
            const shouldCheck = ['yes', 'true', '1', 'on'].includes(value.toLowerCase());
            inp.checked = shouldCheck;
            triggerEvents(inp);
            return;
        }

        // Handle text inputs and textareas
        // Use native setter to work with React controlled components
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        )?.set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
        )?.set;

        const setter = tagName === 'textarea' ? nativeTextAreaValueSetter : nativeInputValueSetter;

        if (setter) {
            setter.call(el, value);
        } else {
            el.value = value;
        }

        triggerEvents(el);
    }

    function triggerEvents(el: HTMLElement) {
        // Trigger events in order React expects
        el.dispatchEvent(new Event('focus', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));

        // React 16+ synthetic event
        const reactKey = Object.keys(el).find((key) =>
            key.startsWith('__reactInternalInstance') ||
            key.startsWith('__reactFiber') ||
            key.startsWith('__reactProps')
        );
        if (reactKey) {
            const reactProps = (el as any)[reactKey];
            if (reactProps?.onChange) {
                reactProps.onChange({ target: el, currentTarget: el });
            }
        }
    }

    // ─── Visual Feedback ────────────────────────────────────
    function flashBorder(el: HTMLElement, type: 'success' | 'error') {
        if (!el) return;
        const color = type === 'success' ? '#22c55e' : '#ef4444';
        const prevBorder = el.style.border;
        const prevOutline = el.style.outline;
        const prevTransition = el.style.transition;

        el.style.transition = 'outline 0.3s, box-shadow 0.3s';
        el.style.outline = `2px solid ${color}`;
        el.style.boxShadow = `0 0 8px ${color}40`;

        setTimeout(() => {
            el.style.transition = 'outline 0.5s, box-shadow 0.5s';
            el.style.outline = prevOutline;
            el.style.boxShadow = '';
            setTimeout(() => {
                el.style.transition = prevTransition;
            }, 500);
        }, 1500);
    }

    function highlightFields(fieldIds: string[]) {
        for (const id of fieldIds) {
            const el = document.querySelector(`[data-rf-field-id="${id}"]`) as HTMLElement;
            if (el) flashBorder(el, 'success');
        }
    }

    // ─── Job Info Extraction ────────────────────────────────
    function extractJobInfo(): Record<string, string> {
        const info: Record<string, string> = {};
        const url = window.location.href.toLowerCase();

        // LinkedIn
        if (url.includes('linkedin.com')) {
            info.title = document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() || '';
            info.company = document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim() || '';
            info.description = document.querySelector('.jobs-description__content')?.textContent?.trim() || '';
        }

        // Indeed
        if (url.includes('indeed.com')) {
            info.title = document.querySelector('.jobsearch-JobInfoHeader-title')?.textContent?.trim() || '';
            info.company = document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() || '';
            info.description = document.querySelector('#jobDescriptionText')?.textContent?.trim() || '';
        }

        // Greenhouse
        if (url.includes('greenhouse.io') || url.includes('boards.greenhouse')) {
            info.title = document.querySelector('.app-title')?.textContent?.trim() ||
                document.querySelector('h1')?.textContent?.trim() || '';
            info.company = document.querySelector('.company-name')?.textContent?.trim() || '';
            info.description = document.querySelector('#content')?.textContent?.trim() || '';
        }

        // Lever
        if (url.includes('lever.co')) {
            info.title = document.querySelector('.posting-headline h2')?.textContent?.trim() || '';
            info.company = document.querySelector('.posting-categories .sort-by-team')?.textContent?.trim() || '';
            info.description = document.querySelector('.section-wrapper')?.textContent?.trim() || '';
        }

        // Workday
        if (url.includes('workday') || url.includes('myworkdayjobs')) {
            info.title = document.querySelector('[data-automation-id="jobPostingHeader"] h2')?.textContent?.trim() ||
                document.querySelector('.css-1q2dra3')?.textContent?.trim() || '';
            info.description = document.querySelector('[data-automation-id="jobPostingDescription"]')?.textContent?.trim() || '';
        }

        // Generic fallback
        if (!info.title) {
            info.title = document.querySelector('h1')?.textContent?.trim() || document.title;
        }
        if (!info.description) {
            // Try to find a job description section
            const descElements = document.querySelectorAll('.job-description, .description, [class*="description"], [id*="description"]');
            for (const el of descElements) {
                const text = el.textContent?.trim();
                if (text && text.length > 100) {
                    info.description = text.substring(0, 3000);
                    break;
                }
            }
        }

        return info;
    }

    // ─── Utilities ──────────────────────────────────────────
    function getXPath(el: Element): string {
        const parts: string[] = [];
        let current: Element | null = el;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling: Element | null = current.previousElementSibling;
            while (sibling) {
                if (sibling.tagName === current.tagName) index++;
                sibling = sibling.previousElementSibling;
            }
            const tagName = current.tagName.toLowerCase();
            const part = index > 0 ? `${tagName}[${index + 1}]` : tagName;
            parts.unshift(part);
            current = current.parentElement;
        }

        return '/' + parts.join('/');
    }
})();
