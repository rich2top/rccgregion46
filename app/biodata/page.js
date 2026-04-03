"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { useQuizApp } from "@/components/quiz-app-provider";
import { QUIZ_CLASS_OPTIONS } from "@/lib/quiz-utils";

export default function BiodataPage() {
  const router = useRouter();
  const { biodata, isHydrated, saveBiodata, startedAt, submittedAt } = useQuizApp();
  const [formData, setFormData] = useState(biodata);

  useEffect(() => {
    setFormData(biodata);
  }, [biodata]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (startedAt && !submittedAt && biodata.email) {
      router.replace("/quiz");
    }
  }, [biodata.email, isHydrated, router, startedAt, submittedAt]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleClassSelect = (value) => {
    setFormData((current) => ({
      ...current,
      classType: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveBiodata(formData);
    window.requestAnimationFrame(() => {
      router.push("/instructions");
    });
  };

  return (
    <PageShell>
      <section className="content-shell">
        <div className="card form-card">
          <div className="page-heading">
            <span className="section-tag">Participant Biodata</span>
            <h1>Enter the participant information</h1>
            <p>
              Fill in the details carefully before proceeding to the instruction page
              for the quiz session.
            </p>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Full name</span>
              <input
                id="fullName"
                name="fullName"
                placeholder="Enter participant name"
                required
                value={formData.fullName}
                onChange={handleChange}
              />
            </label>

            <label className="field">
              <span>Email address</span>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter participant email"
                required
                value={formData.email}
                onChange={handleChange}
              />
            </label>

            <div className="two-up">
              <label className="field">
                <span>Region</span>
                <input id="region" name="region" value={formData.region} readOnly />
              </label>

              <div className="field">
                <span>Class</span>
                <div className="segment-control" role="radiogroup" aria-label="Select class">
                  {QUIZ_CLASS_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`segment-button${formData.classType === item.value ? " active" : ""}`}
                      aria-pressed={formData.classType === item.value}
                      onClick={() => handleClassSelect(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="two-up">
              <label className="field">
                <span>Province</span>
                <input
                  id="province"
                  name="province"
                  placeholder="Enter province"
                  required
                  value={formData.province}
                  onChange={handleChange}
                />
              </label>

              <label className="field">
                <span>Zone</span>
                <input
                  id="zone"
                  name="zone"
                  placeholder="Enter zone"
                  required
                  value={formData.zone}
                  onChange={handleChange}
                />
              </label>
            </div>

            <p className="support-note">
              Next step: the participant reviews the instructions before the timed
              quiz begins.
            </p>

            <div className="action-row">
              <button type="submit" className="primary-button">
                Continue
              </button>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
