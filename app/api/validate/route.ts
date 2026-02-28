import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { schema, caseData } = await req.json();

    if (!schema || !caseData) {
      return NextResponse.json(
        { error: "Missing schema or case data" },
        { status: 400 }
      );
    }

    let currentState = schema.states[0] || "initial";
    const path = [currentState];
    const violations = [];

    for (const rule of schema.rules) {
      const factValue = caseData[rule.fact];
      let passed = false;

      switch (rule.operator) {
        case "equal":
          passed = factValue === rule.value;
          break;
        case "notEqual":
          passed = factValue !== rule.value;
          break;
        case "greaterThan":
          passed = factValue > rule.value;
          break;
        case "lessThan":
          passed = factValue < rule.value;
          break;
        case "greaterThanInclusive":
          passed = factValue >= rule.value;
          break;
        case "lessThanInclusive":
          passed = factValue <= rule.value;
          break;
        case "contains":
          passed = Array.isArray(factValue)
            ? factValue.includes(rule.value)
            : String(factValue).includes(String(rule.value));
          break;
        default:
          passed = false;
      }

      if (passed) {
        currentState = rule.onSuccess;
        path.push(currentState);
      } else {
        currentState = rule.onFailure;
        path.push(currentState);
        violations.push({
          ruleId: rule.id,
          fact: rule.fact,
          providedValue: factValue,
          requiredValue: rule.value,
        });
        break;
      }
    }

    return NextResponse.json({
      status: currentState,
      path,
      violations,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}