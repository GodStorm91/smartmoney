import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { faqCategories, type FAQ } from '@/data/faq-data'

function FAQItem({ faq }: { faq: FAQ }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-2 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-gray-500 flex-shrink-0 transition-transform duration-200',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <div className="px-2 pb-4 text-gray-600 leading-relaxed">
          {faq.answer}
        </div>
      )}
    </div>
  )
}

export function FAQSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to know before getting started
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqCategories.map((category, index) => (
            <div key={index}>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {category.category}
              </h3>
              <Card className="divide-y divide-gray-200">
                {category.items.map((faq, faqIndex) => (
                  <FAQItem key={faqIndex} faq={faq} />
                ))}
              </Card>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Still have questions? We're here to help!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:support@smartmoney.com"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Email Support
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="https://discord.gg/smartmoney"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Join Discord
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="https://github.com/smartmoney/issues"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              GitHub Issues
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
