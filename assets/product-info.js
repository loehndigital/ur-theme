if (!customElements.get('product-info')) {
  customElements.define(
    'product-info',
    class ProductInfo extends HTMLElement {
      constructor() {
        super();
        this.input = this.querySelector('.quantity__input');
        this.currentVariant = this.querySelector('.product-variant-id');
        this.variantSelects = this.querySelector('variant-radios');
        this.submitButton = this.querySelector('[type="submit"]');
      }

      cartUpdateUnsubscriber = undefined;
      variantChangeUnsubscriber = undefined;

      connectedCallback() {
        if (!this.input) return;
        this.quantityForm = this.querySelector('.product-form__quantity');
        if (!this.quantityForm) return;
        this.setQuantityBoundries();
        if (!this.dataset.originalSection) {
          this.cartUpdateUnsubscriber = subscribe(
            PUB_SUB_EVENTS.cartUpdate,
            this.fetchQuantityRules.bind(this),
          );
        }
        this.variantChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.variantChange,
          (event) => {
            const sectionId = this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section;
            if (event.data.sectionId !== sectionId) return;
            this.updateQuantityRules(event.data.sectionId, event.data.html);
            this.setQuantityBoundries();
          },
        );
      }

      disconnectedCallback() {
        if (this.cartUpdateUnsubscriber) {
          this.cartUpdateUnsubscriber();
        }
        if (this.variantChangeUnsubscriber) {
          this.variantChangeUnsubscriber();
        }
      }

      setQuantityBoundries() {
        const data = {
          cartQuantity: this.input.dataset.cartQuantity
            ? parseInt(this.input.dataset.cartQuantity)
            : 0,
          min: this.input.dataset.min ? parseInt(this.input.dataset.min) : 1,
          max: this.input.dataset.max ? parseInt(this.input.dataset.max) : null,
          step: this.input.step ? parseInt(this.input.step) : 1,
        };

        let min = data.min;
        const max = data.max === null ? data.max : data.max - data.cartQuantity;
        if (max !== null) min = Math.min(min, max);
        if (data.cartQuantity >= data.min) min = Math.min(min, data.step);

        this.input.min = min;
        this.input.max = max;
        this.input.value = min;
        publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
      }

      fetchQuantityRules() {
        if (!this.currentVariant || !this.currentVariant.value) return;
        this.querySelector(
          '.quantity__rules-cart .loading-overlay',
        ).classList.remove('hidden');
        fetch(
          `${this.dataset.url}?variant=${this.currentVariant.value}&section_id=${this.dataset.section}`,
        )
          .then((response) => {
            return response.text();
          })
          .then((responseText) => {
            const html = new DOMParser().parseFromString(
              responseText,
              'text/html',
            );
            this.updateQuantityRules(this.dataset.section, html);
            this.setQuantityBoundries();
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.querySelector(
              '.quantity__rules-cart .loading-overlay',
            ).classList.add('hidden');
          });
      }

      updateQuantityRules(sectionId, html) {
        const quantityFormUpdated = html.getElementById(
          `Quantity-Form-${sectionId}`,
        );
        const selectors = [
          '.quantity__input',
          '.quantity__rules',
          '.quantity__label',
        ];
        for (let selector of selectors) {
          const current = this.quantityForm.querySelector(selector);
          const updated = quantityFormUpdated.querySelector(selector);
          if (!current || !updated) continue;
          if (selector === '.quantity__input') {
            const attributes = [
              'data-cart-quantity',
              'data-min',
              'data-max',
              'step',
            ];
            for (let attribute of attributes) {
              const valueUpdated = updated.getAttribute(attribute);
              if (valueUpdated !== null)
                current.setAttribute(attribute, valueUpdated);
            }
          } else {
            current.innerHTML = updated.innerHTML;
          }
        }
      }
    },
  );
}


document.addEventListener('DOMContentLoaded', function() {
  const heading = document.querySelector('.bsub-widget__sub-details-heading');

  if (heading) {
      heading.textContent = "Abonnement Info";
  }

  const details = document.querySelector('.bsub-widget__sub-details-desc');
  if (details) {
      const newDiv = document.createElement('div');
      newDiv.textContent = "Ihr Abonnement wird automatisch erneuert. Sie können Lieferungen jederzeit überspringen oder Ihr Abonnement flexibel kündigen.";
      newDiv.className = 'bsub-widget__custom-info';
      details.parentNode.insertBefore(newDiv, details);
  }

  const branding = document.querySelector('.bsub-widget__branding');
  if (branding) {
      branding.style.display = 'none';
  }

  const btn = document.querySelector('.bsub-widget__toggle-details-btn > div');
  if (btn) {
      btn.textContent = "Abonnement Info";
  }

  const policy = document.querySelector('.bsub-widget__policy-link');
  if (policy) {
      policy.textContent = 'Abonnement Richtlinien';
      policy.style.fontSize = 'small';
  }
});