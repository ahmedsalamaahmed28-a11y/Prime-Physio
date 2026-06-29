"use client";

import { motion } from "framer-motion";

const stats = [
  { id: 1, name: "مركز", value: "+100" },
  { id: 2, name: "جلسة", value: "+25K" },
  { id: 3, name: "طبيب", value: "+150" },
  { id: 4, name: "رضا العملاء", value: "98%" },
  { id: 5, name: "دعم فني", value: "24/7" },
];

export default function Stats() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-16 text-center lg:grid-cols-5">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="mx-auto flex max-w-xs flex-col gap-y-2 group"
            >
              <dt className="text-base leading-7 text-slate-500 font-semibold">{stat.name}</dt>
              <dd className="order-first text-4xl sm:text-5xl font-black tracking-tight text-slate-900 group-hover:text-[#4F46E5] transition-colors duration-300">
                {stat.value}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </div>
  );
}
